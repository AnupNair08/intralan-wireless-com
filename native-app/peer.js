const { NetworkInfo } = require("react-native-network-info");
import { mediaDevices } from "react-native-webrtc";
import { Alert } from "react-native";
require("react-native-webrtc");
import Peer from "react-native-peerjs";
import { store } from "./redux/store";
import { setAVStream } from "./redux/streamRedux/streamAction";
import { setConnStatus } from "./redux/dataRedux/dataAction";
import nodejs from "nodejs-mobile-react-native";
import RNFetchBlob from "react-native-fetch-blob";
var RNFS = require("react-native-fs");
import DocumentPicker from "react-native-document-picker";
import FileViewer from "react-native-file-viewer";
class PeerClient {
  constructor(connection) {
    this.connection = connection;
    NetworkInfo.getIPV4Address().then((ip) => {
      this.ip = connection?.ip ? connection.ip : ip;
      if (this.connection) store.dispatch(setConnStatus("connecting"));
      this.peer = new Peer(null, {
        host: this.ip,
        port: 5000,
        path: "/peerjs",
        secure: false,
        debug: true,
      });
      this.fileBuffer = [];
      this.chunksize = 65535;
      this.state = store.getState();
      console.log("firing listeners");
      this.fireEventListeners();
      this.getMediaSource();
    });
  }
  getMediaSource = () => {
    mediaDevices.enumerateDevices().then((sourceInfos) => {
      let audioSourceId;
      for (let i = 0; i < sourceInfos.length; i++) {
        const sourceInfo = sourceInfos[i];
        if (sourceInfo.kind == "audioinput") {
          audioSourceId = sourceInfo.deviceId;
        }
      }
      mediaDevices
        .getUserMedia({
          audio: true,
        })
        .then((stream) => {
          this.stream = stream;
        })
        .catch((error) => {
          console.log("error in getting media media", error);
          // Log error
        });
    });
  };
  fireEventListeners = () => {
    this.peer.on("error", (err) => {
      console.log("listen", err);
    });
    this.peer.on("signal", (data) => {
      if (data.renegotiate || data.transceiverRequest) return;
    });
    this.peer.on("open", (peerId) => {
      this.peerId = peerId;
      console.log("Local peer open with ID", peerId, this.connection);
      if (this.connection) {
        switch (this.connection.operation) {
          case "call": {
            store.dispatch(setConnStatus(null));
            this.connect();
            break;
          }
          case "file": {
            //add one more state - maybe change previous one to searching and this one to connecting !!
            this.fileTransfer();
            break;
          }
          default: {
            store.dispatch(setConnStatus(null));
          }
        }
      } else {
        nodejs.channel.send(JSON.stringify({ localPeerId: peerId }));
      }
    });

    this.peer.on("connection", (conn) => {
      console.log("Local peer has received connection.");
      conn.on("error", (err) => {
        console.log("peer", err);
      });
      conn.on("open", () => {
        console.log("Local peer has opened connection.", this.peerId);
        // console.log("conn", conn);
        this.fileBuffer = [];
        conn.on("data", (data) => {
          if (data?.operation === "file") {
            // console.log(data);
            this.saveFile(data);
          } else {
            console.log("Local peer sending some data.");
            conn.send("Hello, this is the LOCAL peer!");
          }
        });
      });
    });
    this.peer.on("call", async (call) => {
      console.log("call received");
      Alert.alert("Incoming Call", "Do you want to accept the call ? ", [
        {
          text: "Accept",
          onPress: () => {
            call.answer(this.stream);
            this.call = call;
            // Receive data
            call.on("stream", (stream) => {
              call.answer(this.stream);
              console.log("call answer", stream);
              store.dispatch(setAVStream(stream));
            });
            call.on("close", function() {
              console.log("The call is closed");
            });
          },
        },
        {
          text: "Decline",
          onPress: () => {},
        },
      ]);
      this.peer.on("data", (res) => {
        this.saveFile(res);
      });
      // use call.close() to finish a call
    });
  };
  async saveFile(res) {
    if (res.file === "EOF") {
      // await new Promise((r) => setTimeout(r, 1000));

      this.fileBuffer = this.fileBuffer.join("");
      const dirLocation = `${RNFetchBlob.fs.dirs.DownloadDir}/intraLANcom`;
      const fileLocation = `${dirLocation}/${res.name}`;

      // console.log(RNFS.DocumentDirectoryPath);
      // console.log(this.fileBuffer )
      RNFetchBlob.fs.isDir(dirLocation).then(async (isDir) => {
        if (!isDir) {
          try {
            await RNFetchBlob.fs.mkdir(dirLocation);
          } catch {
            console.log("something went wrong in creating folder");
          }
        }
      });
      try {
        RNFetchBlob.fs
          .writeFile(fileLocation, this.fileBuffer, "base64")
          .then((rslt) => {
            // console.log(this.fileBuffer);
            console.log(
              "File written successfully",
              rslt,
              this.fileBuffer.length
            );
            Alert.alert("File saved successfully");
          });
      } catch (err) {
        console.log(err);
      }
      // await FileViewer.open(fileLocation);
    } else {
      this.fileBuffer.push(res.file);
      console.log(
        "chunk length",
        this.fileBuffer.join("").length,
        this.fileBuffer.length
      );
    }
  }
  async sendFile(conn) {
    try {
      const res = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        readContent: true,
      });
      console.log(
        res.uri,
        res.type, // mime type
        res.name,
        res.size
      );
      const file = await RNFS.readFile(res.uri, "base64");
      console.log(file);
      console.log("sending file");
      let j = 0;
      for (let i = 0; i < res.size; i += this.chunksize) {
        j += 1;
        conn.send({
          ...res,
          file: file.slice(i, i + this.chunksize),
          operation: "file",
        });
        console.log("sending chunk ", j);
      }
      conn.send({
        ...res,
        file: "EOF",
        operation: "file",
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker, exit any dialogs or menus and move on
      } else {
        throw err;
      }
    }
  }
  async fileTransfer() {
    const conn = this.peer.connect(this.connection.peerId, {
      metadata: {
        username: this.connection.username,
      },
    });
    conn.on("error", (err) => {
      console.log("conn", err);
    });
    conn.on("open", () => {
      store.dispatch(setConnStatus(null));
      console.log("Remote peer has opened connection.");
      this.sendFile(conn);
    });
  }
  endCall = () => {
    console.log("endCall");
    this?.call && this.call.close();
  };

  getPeerId = () => {
    return this.peerId;
  };
  startCall = () => {
    console.log("console media", this.stream, this.connection.peerId);

    const call = this.peer.call(this.connection.peerId, this.stream);
    store.dispatch(setConnStatus("ringing"));
    setTimeout(() => {
      if (this.state.data.connStatus === "ringing") {
        store.dispatch(setConnStatus(null));
        Alert.alert("User declined your call or went offline :(");
      }
    }, 20000);
    this.call = call;

    // store.dispatch(setAVStream(stream));

    call.on("stream", function(stream) {
      console.log("peer is streaming", this.peerId, stream);
      store.dispatch(setAVStream(stream));
      store.dispatch(setConnStatus(null)); //change to picked-up status
      // onReceiveStream(stream, "peer-camera");
    });
    call.on("close", function() {
      console.log("The call is closed");
    });
  };

  handleMessage = (data) => {
    console.log("receiving data from peer ", data);
  };
  connect = () => {
    this.startCall();
  };
}

module.exports = { PeerClient };
