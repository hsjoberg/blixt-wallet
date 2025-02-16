// I generated this file with Cursor + Claude 3.5 Sonnet
import React, { useEffect, useState } from "react";
import { Button, Text, View, ScrollView, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { format, addHours } from "date-fns";
import Container from "../components/Container";
import { getItem } from "../storage/app";
import { StorageItem } from "../storage/storage-types";
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
}

// Modify TimeBlock interface
interface TimeBlock {
  hour: number;
  date: Date;
  syncs: SyncWorkRecord[]; // Changed from single sync to array
}

export default function SyncWorkerTimelineReport() {
  const navigation = useNavigation();
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        // Get sync records first
        const recordsJson = await getItem("syncWorkHistory");
        let records: SyncWorkRecord[] = [];
        if (recordsJson) {
          records = JSON.parse(recordsJson);
        }

        if (records.length === 0) {
          setTimeBlocks([]);
          return;
        }

        // Find start and end dates from records
        const timestamps = records.map((r) => r.timestamp);
        const latestTime = Math.max(...timestamps);
        const earliestTime = Math.min(...timestamps);

        // Create Date objects and round to start/end of days
        const endDate = new Date(latestTime);
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date(earliestTime);
        startDate.setHours(0, 0, 0, 0);

        // Generate blocks for the time range
        const blocks: TimeBlock[] = [];
        let currentDate = new Date(startDate);

        // Generate a block for every hour of every day in the range
        while (currentDate <= endDate) {
          blocks.push({
            hour: currentDate.getHours(),
            date: new Date(currentDate),
            syncs: [], // Initialize empty array
          });
          currentDate = addHours(currentDate, 1);
        }

        // Match records to hour blocks
        records.forEach((record) => {
          const recordDate = new Date(record.timestamp);
          const blockIndex = blocks.findIndex(
            (block) =>
              block.date.getFullYear() === recordDate.getFullYear() &&
              block.date.getMonth() === recordDate.getMonth() &&
              block.date.getDate() === recordDate.getDate() &&
              block.date.getHours() === recordDate.getHours(),
          );

          if (blockIndex !== -1) {
            blocks[blockIndex].syncs.push(record);
          }
        });

        // Reverse the blocks to show newest first
        blocks.reverse();

        setTimeBlocks(blocks);
      } catch (e) {
        console.error("Failed to load sync records:", e);
      }
    };
    loadData();
  }, []);

  const getBlockColor = (result: SyncResult) => {
    if (result === SyncResult.SUCCESS_CHAIN_SYNCED) return blixtTheme.green;
    if (result === SyncResult.SUCCESS_LND_ALREADY_RUNNING) return blixtTheme.primary;
    if (
      [
        SyncResult.FAILURE_STATE_TIMEOUT,
        SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT,
        SyncResult.FAILURE_GENERAL,
      ].includes(result)
    ) {
      return blixtTheme.red;
    }
    return blixtTheme.primary;
  };

  const getStatusText = (result: SyncResult) => {
    switch (result) {
      case SyncResult.SUCCESS_CHAIN_SYNCED:
        return "Synced";
      case SyncResult.SUCCESS_LND_ALREADY_RUNNING:
        return "Lnd Already Running";
      case SyncResult.SUCCESS_ACTIVITY_INTERRUPTED:
        return "Interrupted";
      case SyncResult.FAILURE_STATE_TIMEOUT:
        return "Timeout";
      case SyncResult.FAILURE_GENERAL:
        return "Failure";
      case SyncResult.FAILURE_CHAIN_SYNC_TIMEOUT:
        return "Sync Timeout";
      case SyncResult.EARLY_EXIT_ACTIVITY_RUNNING:
        return "MainActivity Running";
      default:
        return "Unknown";
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  return (
    <Container>
      <View style={styles.header}>
        <Text style={styles.title}>Sync Timeline</Text>
        <Button onPress={() => navigation.goBack()} title="Back" />
      </View>

      <ScrollView style={styles.scrollView}>
        {timeBlocks.map((block, i) => (
          <View key={i} style={styles.timelineRow}>
            {/* Date header for first block of the day or first block overall */}
            {(i === 0 ||
              format(block.date, "yyyy-MM-dd") !==
                format(timeBlocks[i - 1].date, "yyyy-MM-dd")) && (
              <Text style={styles.dateHeader}>{format(block.date, "MMMM d, yyyy")}</Text>
            )}

            <View style={styles.hourRow}>
              <Text style={styles.timeText}>{format(block.date, "HH:mm")}</Text>

              <View style={styles.syncBlock}>
                {block?.syncs.length > 0 ? (
                  <View style={styles.syncIndicators}>
                    {block.syncs.map((sync, index) => (
                      <View
                        key={index}
                        style={[
                          styles.syncIndicator,
                          { backgroundColor: getBlockColor(sync.result) },
                        ]}
                      >
                        <Text style={styles.syncText} numberOfLines={1}>
                          {getStatusText(sync.result)} ({formatDuration(sync.duration)})
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={[styles.syncIndicator, { backgroundColor: blixtTheme.gray }]} />
                )}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </Container>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: blixtTheme.light,
  },
  scrollView: {
    flex: 1,
  },
  timelineRow: {
    paddingHorizontal: 8,
  },
  dateHeader: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: blixtTheme.gray,
    padding: 4,
    borderRadius: 4,
    color: "#fff",
  },
  hourRow: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    marginVertical: 0,
  },
  timeText: {
    width: 45,
    fontSize: 11,
    color: blixtTheme.lightGray,
  },
  syncBlock: {
    flex: 1,
    height: 20,
    marginLeft: 8,
    flexDirection: "row",
    overflow: "hidden",
  },
  syncIndicators: {
    flex: 1,
    flexDirection: "row",
    gap: 2,
  },
  syncIndicator: {
    flex: 1,
    height: "100%",
    borderRadius: 3,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  syncText: {
    color: "#fff",
    fontSize: 10,
  },
});
