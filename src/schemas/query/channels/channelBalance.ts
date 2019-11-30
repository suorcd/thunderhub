import { getChannelBalance as getLnChannelBalance } from 'ln-service';
import { logger } from '../../../helpers/logger';
import { ChannelBalanceType } from '../../../schemaTypes/query/info/channelBalance';
import { requestLimiter } from '../../../helpers/rateLimiter';
import { GraphQLNonNull, GraphQLString } from 'graphql';
import { getAuthLnd, getErrorMsg } from '../../../helpers/helpers';

interface ChannelBalanceProps {
    channel_balance: number;
    pending_balance: number;
}

export const getChannelBalance = {
    type: ChannelBalanceType,
    args: { auth: { type: new GraphQLNonNull(GraphQLString) } },
    resolve: async (root: any, params: any, context: any) => {
        await requestLimiter(context.ip, params, 'channelBalance', 1, '1s');

        const lnd = getAuthLnd(params.auth);

        try {
            const channelBalance: ChannelBalanceProps = await getLnChannelBalance(
                {
                    lnd: lnd,
                },
            );
            return {
                confirmedBalance: channelBalance.channel_balance,
                pendingBalance: channelBalance.pending_balance,
            };
        } catch (error) {
            logger.error('Error getting channel balance: %o', error);
            throw new Error(getErrorMsg(error));
        }
    },
};
