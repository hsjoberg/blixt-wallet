import React, { useState } from "react";
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Button } from "native-base";
import { blixtTheme } from "../native-base-theme/variables/commonColor";

interface NeutrinoPeersModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (peers: string[]) => void;
  initialPeers: string[];
}

const NeutrinoPeersModal: React.FC<NeutrinoPeersModalProps> = ({
  visible,
  onClose,
  onSave,
  initialPeers,
}) => {
  const [peers, setPeers] = useState(initialPeers);

  const addPeer = () => {
    setPeers([...peers, ""]);
  };

  const removePeer = (index: number) => {
    setPeers(peers.filter((_, i) => i !== index));
  };

  const updatePeer = (text: string, index: number) => {
    const newPeers = peers.slice();
    newPeers[index] = text;
    setPeers(newPeers);
  };

  const handleSave = () => {
    onSave(peers.filter((peer) => peer.trim() !== ""));
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Set Neutrino Peers</Text>
          {peers.map((peer, index) => (
            <View key={index} style={styles.peerRow}>
              <TextInput
                style={styles.input}
                value={peer}
                onChangeText={(text) => updatePeer(text, index)}
                placeholder={`Peer ${index + 1}`}
              />
              <TouchableOpacity onPress={() => removePeer(index)} style={styles.removeButton}>
                <Text style={styles.buttonText}>-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity onPress={addPeer} style={styles.addButton}>
            <Text style={styles.buttonText}>+</Text>
          </TouchableOpacity>
          <View style={styles.buttonRow}>
            <TouchableOpacity onPress={onClose} style={styles.button}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.button}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: "80%",
    backgroundColor: blixtTheme.dark,
    padding: 20,
    borderRadius: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  peerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 5,
    padding: 10,
  },
  removeButton: {
    marginLeft: 10,
    padding: 10,
    backgroundColor: blixtTheme.red,
    borderRadius: 5,
  },
  addButton: {
    padding: 10,
    backgroundColor: blixtTheme.green,
    borderRadius: 5,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  button: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    marginHorizontal: 5,
    backgroundColor: "#007bff",
    borderRadius: 5,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default NeutrinoPeersModal;
