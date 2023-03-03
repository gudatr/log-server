"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Environment_1 = require("../services/Environment");
const SharedService_1 = __importDefault(require("../services/SharedService"));
async function c(pool) {
    await new Promise((res) => {
        setTimeout(() => {
            res(true);
        }, 2500);
    });
    let table_columns = await pool.query('table-info', `SELECT column_name FROM information_schema.columns
        WHERE table_schema = $1
        AND table_name = $2;`, [Environment_1.Environment.postgres.schema, Environment_1.Environment.postgres.logs_table]);
    if (table_columns.length === 0) {
        let client = await pool.connect();
        SharedService_1.default.log(`Running table setup as logs table (${Environment_1.Environment.postgres.logs_table}) does not exist.`);
        try {
            await client.queryString(`
            CREATE TABLE ${Environment_1.Environment.postgres.logs_table} (
                id BIGSERIAL PRIMARY KEY,
                level SMALLINT,
                time BIGINT,
                server VARCHAR(${Environment_1.Environment.postgres.column_server_size}),
                channel VARCHAR(${Environment_1.Environment.postgres.column_channel_size}),
                message VARCHAR(256),
                data VARCHAR(4096),
                search TSVECTOR);`);
            SharedService_1.default.log(`Created logs table as ${Environment_1.Environment.postgres.logs_table}`);
            await client.queryString(`
            CREATE TABLE ${Environment_1.Environment.postgres.metrics_table} (
                id BIGSERIAL PRIMARY KEY,
                time BIGINT,
                server VARCHAR(${Environment_1.Environment.postgres.column_server_size}),
                cpu REAL,
                mem_used REAL,
                io_read REAL,
                io_write REAL,
                disk_used REAL,
                net_in REAL,
                net_out REAL);`);
            SharedService_1.default.log(`Created metrics table as ${Environment_1.Environment.postgres.metrics_table}`);
            await client.queryString(`
            CREATE TABLE ${Environment_1.Environment.postgres.triggers_table} (
                id BIGSERIAL PRIMARY KEY,
                name VARCHAR(128),
                description VARCHAR(256),
                type VARCHAR(16),
                value VARCHAR(16),
                active BOOLEAN,
                threshold REAL,
                time INT);`);
            SharedService_1.default.log(`Created triggers table as ${Environment_1.Environment.postgres.triggers_table}`);
            await client.queryString(`
            CREATE TABLE ${Environment_1.Environment.postgres.trigger_messages_table} (
                id BIGSERIAL PRIMARY KEY,
                trigger_id BIGINT,
                server VARCHAR(${Environment_1.Environment.postgres.column_server_size}),
                value REAL,
                time BIGINT);`);
            SharedService_1.default.log(`Created trigger messages table as ${Environment_1.Environment.postgres.trigger_messages_table}`);
            await client.queryString(`
            CREATE FUNCTION logs_search_tsvector_update() RETURNS trigger AS $$
            BEGIN
                IF new.channel = 'metrics' THEN return new; END IF;
                new.search :=
                    setweight(to_tsvector('${Environment_1.Environment.postgres.language}', new.data), 'A')
                    || setweight(to_tsvector('${Environment_1.Environment.postgres.language}', new.message), 'B');
                return new;
                END
            $$ LANGUAGE plpgsql`);
            SharedService_1.default.log(`Created function logs_search_tsvector_update`);
            await client.queryString(`
            CREATE TRIGGER logs_search_tsvector_trigger
            BEFORE INSERT OR UPDATE
            ON ${Environment_1.Environment.postgres.logs_table} FOR EACH ROW
            EXECUTE PROCEDURE logs_search_tsvector_update(); `);
            SharedService_1.default.log(`Created trigger logs_search_tsvector_trigger`);
            await client.queryString(`
            CREATE INDEX logs_level_index ON ${Environment_1.Environment.postgres.logs_table} USING BTREE(level); `);
            await client.queryString(`
            CREATE INDEX logs_time_index ON ${Environment_1.Environment.postgres.logs_table} USING BTREE(time); `);
            await client.queryString(`
            CREATE INDEX logs_channel_index ON ${Environment_1.Environment.postgres.logs_table} USING HASH(channel); `);
            await client.queryString(`
            CREATE INDEX logs_server_index ON ${Environment_1.Environment.postgres.logs_table} USING HASH(server); `);
            await client.queryString(`
            CREATE INDEX logs_search_index ON ${Environment_1.Environment.postgres.logs_table} USING GIN(search); `);
            await client.queryString(`
            CREATE INDEX trigger_messages_trigger_id_index ON ${Environment_1.Environment.postgres.trigger_messages_table} USING BTREE(trigger_id); `);
            await client.queryString(`
            CREATE INDEX trigger_messages_time_index ON ${Environment_1.Environment.postgres.trigger_messages_table} USING BTREE(time);`);
            await client.queryString(`
            CREATE INDEX metrics_time_index ON ${Environment_1.Environment.postgres.metrics_table} USING BTREE(time);`);
            await client.queryString(`
            CREATE INDEX metrics_server_index ON ${Environment_1.Environment.postgres.metrics_table} USING HASH(server); `);
            SharedService_1.default.log(`Created indexes`);
        }
        catch (err) {
            client.release();
            SharedService_1.default.log(`Table Setup failed`, err);
            return false;
        }
        SharedService_1.default.log(`Table Setup successful`);
        return true;
    }
    let required_columns = ["id", "level", "time", "server", "channel", "message", "data", "search"];
    for (let column of table_columns) {
        if (!required_columns.includes(column.column_name)) {
            SharedService_1.default.log(`Table setup failed: Logs table ${Environment_1.Environment.postgres.logs_table} exists but does not contain the required columns`);
            return false;
        }
    }
    SharedService_1.default.log(`Table setup skipped`);
    SharedService_1.default.log(`If you were expecting the setup to execute, please consult the documentation's troubleshooting section`);
    return true;
}
exports.default = c;