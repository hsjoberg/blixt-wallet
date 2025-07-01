// I generated this file with Cursor + Claude 3.5 Sonnet
import React, { useEffect, useState } from "react";
import { Button, Text, View, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { SafeAreaView } from "react-native-safe-area-context";

import Container from "../components/Container";
import { getItem } from "../storage/app";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

interface SyncWorkRecord {
  timestamp: number;
  duration: number;
  result: SyncResult;
  errorMessage?: string;
}

enum SyncResult {
  EARLY_EXIT_ACTIVITY_RUNNING = "EARLY_EXIT_ACTIVITY_RUNNING",
  SUCCESS_LND_ALREADY_RUNNING = "SUCCESS_LND_ALREADY_RUNNING",
  SUCCESS_CHAIN_SYNCED = "SUCCESS_CHAIN_SYNCED",
  FAILURE_STATE_TIMEOUT = "FAILURE_STATE_TIMEOUT",
  SUCCESS_ACTIVITY_INTERRUPTED = "SUCCESS_ACTIVITY_INTERRUPTED",
  FAILURE_GENERAL = "FAILURE_GENERAL",
  FAILURE_CHAIN_SYNC_TIMEOUT = "FAILURE_CHAIN_SYNC_TIMEOUT",
  EARLY_EXIT_PERSISTENT_SERVICES_ENABLED = "EARLY_EXIT_PERSISTENT_SERVICES_ENABLED",
  EARLY_EXIT_TOR_ENABLED = "EARLY_EXIT_TOR_ENABLED",
}

const isNeutralResult = (result: SyncResult) => {
  return [SyncResult.SUCCESS_LND_ALREADY_RUNNING, SyncResult.EARLY_EXIT_ACTIVITY_RUNNING].includes(
    result,
  );
};

const isSuccessResult = (result: SyncResult) => {
  return [SyncResult.SUCCESS_CHAIN_SYNCED, SyncResult.SUCCESS_ACTIVITY_INTERRUPTED].includes(
    result,
  );
};

const getStatusText = (result: SyncResult): string => {
  switch (result) {
    case SyncResult.EARLY_EXIT_ACTIVITY_RUNNING:
      return "Skipped (App Running)";
    case SyncResult.SUCCESS_LND_ALREADY_RUNNING:
      return "Success (Already Running)";
    case SyncResult.SUCCESS_CHAIN_SYNCED:
      return "Success (Chain Synced)";
    case SyncResult.FAILURE_STATE_TIMEOUT:
      return "Failed (State Timeout)";
    case SyncResult.SUCCESS_ACTIVITY_INTERRUPTED:
      return "Interrupted (App Started)";
    case SyncResult.FAILURE_GENERAL:
      return "Failed (Error)";
    case SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT:
      return "Failed (Chain Sync Timeout)";
    case SyncResult.EARLY_EXIT_PERSISTENT_SERVICES_ENABLED:
      return "Skipped (Persistent Services Enabled)";
    case SyncResult.EARLY_EXIT_TOR_ENABLED:
      return "Skipped (Tor Enabled)";
  }
};

export interface ISyncWorkerReportProps {}

export default function SyncWorkerReport({}: ISyncWorkerReportProps) {
  const navigation = useNavigation();
  // const { t } = useTranslation(namespaces.syncWorkerReport);
  const [records, setRecords] = useState<SyncWorkRecord[]>([]);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const recordsJson = await getItem("syncWorkHistory");
        if (recordsJson) {
          const parsedRecords = JSON.parse(recordsJson);
          setRecords(parsedRecords.reverse()); // Show newest first
        }
      } catch (e) {
        console.error("Failed to load sync records:", e);
      }
    };
    loadRecords();
  }, []);

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: blixtTheme.dark }}>
      <View style={styles.header}>
        <Text style={styles.title}>Sync History</Text>
        <Button onPress={() => navigation.goBack()} title="Back" />
      </View>

      <ScrollView style={styles.scrollView}>
        {records.length === 0 && <Text style={styles.emptyText}>No sync history available</Text>}

        {records.map((record, index) => (
          <View
            key={index}
            style={[
              styles.recordCard,
              isSuccessResult(record.result)
                ? styles.successCard
                : isNeutralResult(record.result)
                  ? styles.neutralCard
                  : styles.failureCard,
            ]}
          >
            <Text style={styles.recordText}>
              Date: {format(record.timestamp, "yyyy-MM-dd HH:mm:ss")}
            </Text>
            <Text style={styles.recordText}>Status: {getStatusText(record.result)}</Text>
            <Text style={styles.recordText}>Duration: {formatDuration(record.duration)}</Text>
            {record.errorMessage && (
              <Text style={styles.errorText}>Error: {record.errorMessage}</Text>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: blixtTheme.light,
  },
  scrollView: {
    flex: 1,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 20,
  },
  recordCard: {
    padding: 15,
    marginHorizontal: 10,
    marginVertical: 5,
    borderRadius: 8,
  },
  successCard: {
    backgroundColor: blixtTheme.green, // "rgba(0, 255, 0, 0.5)",
  },
  failureCard: {
    backgroundColor: blixtTheme.red, // "rgba(255, 0, 0, 0.5)",
  },
  neutralCard: {
    backgroundColor: blixtTheme.primary, // or any orange color you prefer
  },
  recordText: {
    marginVertical: 2,
  },
  errorText: {
    marginTop: 5,
    fontStyle: "italic",
  },
});
