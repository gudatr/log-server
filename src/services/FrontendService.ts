import RequestData from '../http/RequestData';
import { HttpResponse } from "uWebSockets.js";
import HasApp from '../http/HasApp';
import { Environment } from './Environment';
import Postgres from "pg-pool-minimal";
import SetupPostgresPool from '../database/PostgresSetup';
import SharedService from './SharedService';

export default class FrontendService extends HasApp {

    private postgresPool!: Postgres

    //The search function is limited since it can be pretty intense for the server
    searchLockLimit = Environment.search_limit;
    searchLock = 0;

    constructor() {
        super(Environment.frontend_port);

        this.bind('post', '/search', this.search);
        this.bind('post', '/metrics', this.searchMetrics);
        this.bind('post', '/auth', this.authTest);
        this.bind('post', '/servers', this.getServers);
        this.bind('post', '/channels', this.getChannels);
        this.bind('post', '/triggers', this.getTriggers);
        this.bind('post', '/triggers/messages', this.getTriggerMessages);
        this.bind('post', '/triggers/create', this.createTrigger);
        this.bind('post', '/triggers/update', this.updateTrigger);
        this.bind('post', '/triggers/delete', this.deleteTrigger);

        ['favicon.ico',
            'style.css',
            'translation.js',
            'frontend.js',
            'app.html'].forEach((element) => {
                this.serveFile(element);
            });

    }

    public async initialize() {
        this.postgresPool = await SetupPostgresPool(Environment.postgres.threads.frontend);
        this.startListening();
    }

    authTest(_request: RequestData, response: HttpResponse) {
        return this.EndReponse(response, 'Authenticated');
    }

    async getServers(request: RequestData, response: HttpResponse) {
        this.EndReponse(response, JSON.stringify(await SharedService.getServerArray(this.postgresPool)));
    }

    async getTriggers(request: RequestData, response: HttpResponse) {
        let data = await this.postgresPool.query("get-triggers", "SELECT * FROM triggers ORDER BY active DESC", []);
        this.EndReponse(response, JSON.stringify(data));
    }

    async getTriggerMessages(request: RequestData, response: HttpResponse) {
        let parameters: TriggerMessagesParameters = JSON.parse(request.data);
        if (parameters.servers === undefined || parameters.servers.length === 0) {
            parameters.servers = await SharedService.getServerArray(this.postgresPool);
        }

        let data = await this.postgresPool.query("trigger-messages", `
        SELECT * from trigger_messages
        WHERE time BETWEEN $1 AND $2
        OFFSET $3 LIMIT $4`, [parameters.intervalStart, parameters.intervalEnd, parameters.page * parameters.pageSize, parameters.pageSize]);

        let entryCount = (await this.postgresPool.query("trigger-messages-count", `
        SELECT COUNT(*) as count from trigger_messages
        WHERE time BETWEEN $1 AND $2`, [parameters.intervalStart, parameters.intervalEnd]))[0].count;

        this.EndReponse(response, JSON.stringify({
            data,
            pageSize: parameters.pageSize,
            page: parameters.page,
            entryCount
        }));
    }

    async getChannels(request: RequestData, response: HttpResponse) {
        this.EndReponse(response, JSON.stringify(await this.getChannelArray()));
    }

    async getChannelArray(): Promise<string[]> {
        let query = await this.postgresPool.query("get-channels", "SELECT DISTINCT channel from logs ORDER BY channel DESC", []);
        let data = query.map(entry => {
            return entry.channel;
        });
        return data;
    }

    parametersInvalid(parameters: any) {
        return parameters.intervalStart == 0 && parameters.intervalEnd == 0 ||
            parameters.page < 0 ||
            parameters.pageSize < 1 ||
            parameters.minimumLevel > parameters.maximumLevel;
    }

    async searchMetrics(request: RequestData, response: HttpResponse) {
        await this.search(request, response, 'metrics');
    }

    async search(request: RequestData, response: HttpResponse, mode: 'metrics' | 'database' = 'database') {

        if (this.searchLock >= this.searchLockLimit) {
            return this.EndReponse(response, 'Locked');
        }

        try {
            this.searchLock++;
            let data = JSON.parse(request.data);

            data.intervalStart = Math.max(0, data.intervalStart);
            data.intervalEnd = Math.min(Date.now(), data.intervalEnd);

            if (mode === 'metrics') {
                await this.metricsSearch(data, response);
            } else {
                await this.databaseSearch(data, response);
            }
        } catch (err: any) {
            response.writeStatus('500 Internal Server Error');
            this.EndReponse(response, JSON.stringify({
                message: err.message,
                stack: err.stack,
            }));
        } finally {
            this.searchLock--;
        }
    }

    async databaseSearch(parametersRaw: any, response: HttpResponse) {
        if (this.parametersInvalid(parametersRaw)) {
            response.writeStatus('400 Bad Request');
            this.EndReponse(response, 'Parameters are not within acceptable ranges');
            return;
        } else {
            let parameters: SearchParameters = parametersRaw;

            if (typeof parameters.searchTerm !== 'string' || !parameters.searchTerm.trim()) {
                parameters.searchTerm = undefined;
            }

            let data = await this.databaseLookup(
                parameters.searchTerm,
                parameters.servers,
                parameters.channels,
                parameters.minimumLevel,
                parameters.maximumLevel,
                parameters.intervalStart,
                parameters.intervalEnd,
                parameters.page * parameters.pageSize,
                parameters.pageSize);

            data.pageSize = parameters.pageSize;
            data.page = parameters.page;

            this.EndReponse(response, JSON.stringify(data));
        }
    }

    async createTrigger(request: RequestData, response: HttpResponse) {
        let data = JSON.parse(request.data);
        let id = await this.postgresPool.query('create-trigger', 'INSERT INTO triggers (name,description,type,value,active,threshold,time) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id',
            [data.name, data.description, data.type, data.value, true, data.threshold, data.time]);
        this.EndReponse(response, id[0].id);
    }

    async updateTrigger(request: RequestData, response: HttpResponse) {
        let data = JSON.parse(request.data);
        let id = await this.postgresPool.query('update-trigger', 'UPDATE triggers SET name=$1,description=$2,type=$3,value=$4,active=$5,threshold=$6,time=$7 WHERE id=$8',
            [data.name, data.description, data.type, data.value, data.active, data.threshold, data.time, data.id]);
        this.EndReponse(response, id[0].id);
    }

    async deleteTrigger(request: RequestData, response: HttpResponse) {
        let data = JSON.parse(request.data);
        await this.postgresPool.query('delete-trigger', 'DELETE FROM triggers WHERE id = $1', [data.id]);
        this.EndReponse(response, 'OK');
    }

    async metricsSearch(parametersRaw: any, response: HttpResponse) {
        let parameters: MetricsParameters = parametersRaw;

        let data = await this.metricsLookup(
            parameters.intervalStart,
            parameters.intervalEnd,
            parameters.resolution);

        this.EndReponse(response, JSON.stringify(data));
    }

    searchQuery1Name = 'search-query-1';
    searchQuery1 = `SELECT level,server,time,message,data FROM ${Environment.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7
    OFFSET $8 LIMIT $9`;

    searchQuery1CountName = 'search-query-1-count';
    searchQuery1Count = `SELECT COUNT(*) as count FROM ${Environment.postgres.logs_table} WHERE 
    search @@ plainto_tsquery($1)
    AND channel = ANY($2)
    AND level BETWEEN $3 AND $4
    AND server = ANY($5)
    AND time BETWEEN $6 AND $7`;

    searchQuery2Name = 'search-query-2';
    searchQuery2 = `SELECT channel,level,server,time,message,data FROM ${Environment.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6
    OFFSET $7 LIMIT $8`;

    searchQuery2CountName = 'search-query-2-count';
    searchQuery2Count = `SELECT COUNT(*) as count FROM ${Environment.postgres.logs_table} WHERE 
    channel = ANY($1)
    AND level BETWEEN $2 AND $3
    AND server = ANY($4)
    AND time BETWEEN $5 AND $6`;

    metricsQueryName = 'search-metrics';
    metricsQuery = `SELECT
    server,
    ROUND(AVG(cpu)::numeric,3) AS cpu,
    ROUND(AVG(mem_used)::numeric,3) AS mem_used,
    ROUND(AVG(io_read)::numeric,3) AS io_read,
    ROUND(AVG(io_write)::numeric,3) AS io_write,
    ROUND(AVG(disk_used)::numeric,3) AS disk_used,
    ROUND(AVG(net_in)::numeric,3) AS net_in,
    ROUND(AVG(net_out)::numeric,3) AS net_out,
    0 AS error_rate,
    0 AS message_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice FROM ${Environment.postgres.metrics_table} WHERE
    time BETWEEN $1 AND $2
    GROUP BY slice, server
    ORDER BY slice`;

    errorRateQueryName = 'error-rate';
    errorRateQuery = `SELECT
    server,
    COUNT(*) as error_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice
    FROM logs WHERE
    time BETWEEN $1 AND $2
    AND level >= $4
    GROUP BY slice, server
    ORDER BY slice`;

    messageRateQueryName = 'message-rate';
    messageRateQuery = `SELECT
    server,
    COUNT(*) as message_rate,
    FLOOR((time - $1 + 0.00001) / ($2::numeric - $1) * $3) as slice
    FROM logs WHERE
    time BETWEEN $1 AND $2
    GROUP BY slice, server
    ORDER BY slice`;

    async metricsLookup(
        minimumTime: number,
        maximumTime: number,
        resolution: number = 30): Promise<MetricsResult> {

        let [data, errorRate, messageRate] = await Promise.all([
            this.postgresPool.query(this.metricsQueryName, this.metricsQuery, [minimumTime, maximumTime, resolution]),
            this.postgresPool.query(this.errorRateQueryName, this.errorRateQuery, [minimumTime, maximumTime, resolution, Environment.error_rate_level]),
            this.postgresPool.query(this.messageRateQueryName, this.messageRateQuery, [minimumTime, maximumTime, resolution])]);

        data.forEach(dataElement => {
            errorRate.forEach(errorRateElement => {
                if (dataElement.slice == errorRateElement.slice && dataElement.server == errorRateElement.server) {
                    return dataElement.error_rate = errorRateElement.error_rate;
                }
            });
            messageRate.forEach(messageRateElement => {
                if (dataElement.slice == messageRateElement.slice && dataElement.server == messageRateElement.server) {
                    return dataElement.message_rate = messageRateElement.message_rate;
                }
            });
        });

        return {
            data,
            entryCount: data.length,
            resolution,
            intervalStart: minimumTime,
            intervalEnd: maximumTime
        }
    }


    async databaseLookup(
        searchTerm: string | undefined,
        servers: string[] | undefined,
        channels: string[] | undefined,
        minimumLevel: number,
        maximumLevel: number,
        minimumTime: number,
        maximumTime: number,
        offset: number,
        pageSize: number): Promise<SearchResult> {

        let data: any[];
        let entryCount: number;

        if (channels === undefined || channels.length === 0) {
            channels = await this.getChannelArray();
        }

        let channelsCasted = '{' + channels.join(',') + '}';

        if (servers === undefined || servers.length === 0) {
            servers = await SharedService.getServerArray(this.postgresPool);
        }

        let serverCasted = '{' + servers.join(',') + '}';

        if (searchTerm !== undefined) {
            let parameters1 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery1Name, this.searchQuery1, parameters1);

            let parameters2 = [searchTerm, channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery1CountName, this.searchQuery1Count, parameters2))[0].count;
        } else {
            let parameters1 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime, offset, pageSize];
            data = await this.postgresPool.query(this.searchQuery2Name, this.searchQuery2, parameters1);

            let parameters2 = [channelsCasted, minimumLevel, maximumLevel, serverCasted, minimumTime, maximumTime];
            entryCount = (await this.postgresPool.query(this.searchQuery2CountName, this.searchQuery2Count, parameters2))[0].count;
        }

        return {
            entryCount,
            data,
            pageSize: 0,
            page: 0
        };
    }
}

class SearchParameters {
    minimumLevel: number = 0;
    maximumLevel: number = 0;
    intervalStart: number = 0;
    intervalEnd: number = 0;
    page: number = 0;
    pageSize: number = 0;
    searchTerm: string | undefined = '';
    servers: string[] = [];
    channels: string[] | undefined;
}

class TriggerMessagesParameters {
    servers: string[] | undefined = [];
    intervalStart: number = 0;
    intervalEnd: number = 0;
    page: number = 0;
    pageSize: number = 0;
}

class MetricsParameters {
    intervalStart: number = 0;
    intervalEnd: number = 0;
    resolution: number = 30;
}

class SearchResult {
    entryCount: number = 0;
    data: any[] = [];
    pageSize: number = 0;
    page: number = 0;
}

class MetricsResult {
    entryCount: number = 0;
    data: any[] = [];
    resolution: number = 0;
    intervalStart: number = 0;
    intervalEnd: number = 0;
}