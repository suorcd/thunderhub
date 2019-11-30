import { pay as payRequest } from 'ln-service';
import { logger } from '../../../helpers/logger';
import { requestLimiter } from '../../../helpers/rateLimiter';
import { GraphQLString, GraphQLNonNull } from 'graphql';
import { PayType } from '../../../schemaTypes/mutation.ts/invoice/pay';
import { getErrorMsg } from '../../../helpers/helpers';

interface HopProps {
    channel: string;
    channel_capacity: number;
    fee_mtokens: string;
    forward_mtokens: string;
    timeout: number;
}

interface RequestProps {
    fee: number;
    fee_mtokens: string;
    hops: HopProps[];
    id: string;
    is_confirmed: boolean;
    is_outgoing: boolean;
    mtokens: string;
    secret: string;
    tokens: number;
}

// TODO: Allow path payments as well
export const pay = {
    type: PayType,
    args: {
        request: {
            type: new GraphQLNonNull(GraphQLString),
        },
    },
    resolve: async (root: any, params: any, context: any) => {
        await requestLimiter(context.ip, params, 'payRequest', 1, '1s');
        const { lnd } = context;

        try {
            const payment: RequestProps = await payRequest({
                lnd: lnd,
                request: params.request,
            });

            const hops = payment.hops.map(hop => {
                return {
                    channel: hop.channel,
                    channelCapacity: hop.channel_capacity,
                    mTokenFee: hop.fee_mtokens,
                    forwardMTokens: hop.forward_mtokens,
                    timeout: hop.timeout,
                };
            });

            return {
                fee: payment.fee,
                feeMTokens: payment.fee_mtokens,
                hops: hops,
                id: payment.id,
                isConfirmed: payment.is_confirmed,
                isOutgoing: payment.is_outgoing,
                mtokens: payment.mtokens,
                secret: payment.secret,
                tokens: payment.tokens,
            };
        } catch (error) {
            logger.error('Error paying request: %o', error);
            throw new Error(getErrorMsg(error));
        }
    },
};
