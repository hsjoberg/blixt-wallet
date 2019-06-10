import React, { useEffect, useState } from "react";
import { ScrollView } from "react-native";
import { Text } from "native-base";
import { readLndLog } from "../lightning";

export default () => {
  const [log, setLog] = useState<string[]>([]);
  useEffect(() => {
    (async () => {
      setLog(await readLndLog());
    })();
  }, []);

  return (
    <ScrollView>
      {log.map((v, k) => (
        <Text key={k} style={{ fontSize: 6 }}>{v}</Text>
      ))}
    </ScrollView>
  );
};
