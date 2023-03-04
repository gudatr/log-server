"use strict";
function initializeTranslation(currentLanguage = 'en') {
    Alpine.store('language', {
        currentLanguage,
        en: {
            page_logging: 'Logging',
            page_metrics: 'Metrics',
            page_trigger_messages: 'Trigger Messages',
            page_triggers: 'Triggers',
            update_speed: 'Update Speed:',
            seconds: ' seconds',
            minutes: ' minutes',
            hours: ' hours',
            all_time: 'All time',
            auto_update_active: 'Auto Update active',
            auto_update_deactivated: 'Auto Update deactivated',
            auth_credentials_incorrect: 'Login failed',
            auth_pending: 'Login pending',
            auth_successful: 'Logged in',
            timeframe_type: 'Timeframe-Type:',
            timeframe_type_timeframe: 'Messages within timeframe',
            timeframe_type_since: 'Messages since',
            search_term: 'Search Term:',
            search: 'Search',
            filter_by_channel: 'Filter by Channel:',
            filter_by_server: 'Filter by Server:',
            time: 'Time:',
            channel: 'Channel:',
            message: 'Message:',
            level: 'Level:',
            server: 'Server:',
            value: 'Value:',
            data: 'Data:',
            password: 'Password:',
            close: 'Close',
            save: 'Save',
            id: 'ID:',
            authenticate: 'Login',
            metrics_cpu: 'CPU Load',
            metrics_mem_used: 'Memory Used %',
            metrics_disk_used: 'Disk Used %',
            metrics_io_write: 'Write IO Operations',
            metrics_io_read: 'Read IO Operations',
            metrics_net_in: 'Traffic In MB',
            metrics_net_out: 'Traffic Out MB',
            metrics_error_rate: 'Error Rate',
            metrics_logs: 'Incoming Log Messages',
            triggers_id: 'ID',
            triggers_add: 'Add',
            triggers_add_title: 'Add Trigger',
            triggers_edit: 'Edit',
            triggers_edit_title: 'Edit Trigger',
            triggers_delete: 'Delete',
            triggers_active: 'Active',
            triggers_name: 'Name',
            triggers_description: 'Description',
            triggers_type: 'Type',
            triggers_value: 'Value',
            triggers_threshold: 'Threshold',
            triggers_time: 'Timeframe (Seconds)',
            triggers_delete_question: 'Are you sure you want to delete the trigger with the ID %s ?',
            triggers_type_gt: 'Greater',
            triggers_type_gteq: 'Greater or equal',
            triggers_type_eq: 'Equal',
            triggers_type_lteq: 'Lower or equal',
            triggers_type_lt: 'Lower',
        },
        de: {
            page_logging: 'Nachrichten',
            page_metrics: 'Metriken',
            page_trigger_messages: 'Trigger-Nachrichten',
            page_triggers: 'Trigger',
            update_speed: 'Aktualisierung nach:',
            seconds: ' Sekunden',
            minutes: ' Minuten',
            hours: ' Stunden',
            all_time: 'Jemals',
            auto_update_active: 'Auto Update aktiv',
            auto_update_deactivated: 'Auto Update inaktiv',
            auth_credentials_incorrect: 'Login gescheitert',
            auth_pending: 'Login ausstehend',
            auth_successful: 'Eingeloggt',
            timeframe_type: 'Zeitraumtyp:',
            timeframe_type_timeframe: 'Nachrichten im Zeitraum',
            timeframe_type_since: 'Nachrichten seit',
            search_term: 'Suchbegriff:',
            search: 'Suche',
            filter_by_channel: 'Nach Kanal filtern:',
            filter_by_server: 'Nach Server filtern:',
            time: 'Zeit:',
            channel: 'Kanal:',
            message: 'Nachricht:',
            level: 'Level:',
            server: 'Server:',
            value: 'Wert:',
            data: 'Daten:',
            password: 'Passwort:',
            close: 'Schließen',
            save: 'Speichern',
            id: 'ID:',
            authenticate: 'Login',
            metrics_cpu: 'CPU Last',
            metrics_mem_used: 'RAM verwendet %',
            metrics_disk_used: 'Speicher verwendet %',
            metrics_io_write: 'Schreib-Operationen',
            metrics_io_read: 'Lese-Operationen',
            metrics_net_in: 'Netzwerk eingehend MB',
            metrics_net_out: 'Netzwerk ausgehend MB',
            metrics_error_rate: 'Fehlerrate',
            metrics_logs: 'Eingehende Nachrichten',
            triggers_id: 'ID',
            triggers_add: 'Hinzufügen',
            triggers_add_title: 'Tigger hinzufügen',
            triggers_edit: 'Beabeiten',
            triggers_edit_title: 'Tigger bearbeiten',
            triggers_delete: 'Löschen',
            triggers_active: 'Aktiv',
            triggers_name: 'Name',
            triggers_description: 'Beschreibung',
            triggers_type: 'Typ',
            triggers_value: 'Wert',
            triggers_threshold: 'Grenzwert',
            triggers_time: 'Zeitraum (Sekunden)',
            triggers_delete_question: 'Sind Sie sicher, dass Sie den Trigger mit der ID %s löschen wollen?',
            triggers_type_gt: 'Größer',
            triggers_type_gteq: 'Größer oder gleich',
            triggers_type_eq: 'Gleich',
            triggers_type_lteq: 'Kleiner oder gleich',
            triggers_type_lt: 'Kleiner',
        },
    });
    return (index, lanuageOverride) => {
        var _a;
        return (_a = Alpine.store('language')[lanuageOverride !== null && lanuageOverride !== void 0 ? lanuageOverride : Alpine.store('language').currentLanguage][index]) !== null && _a !== void 0 ? _a : index;
    };
}
