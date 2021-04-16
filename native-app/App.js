import React, { Component } from "react";
import { createMaterialBottomTabNavigator } from "@react-navigation/material-bottom-tabs";
import { PermissionsAndroid, AppState, Linking } from "react-native";
import { connect } from "react-redux";
import { updateConnections, updateInfo } from "./redux/dataRedux/dataAction";
import { setLocalPeer, setRemotePeer } from "./redux/streamRedux/streamAction";
import BackgroundService from "react-native-background-actions";
import Home from "./screens/Home";
import { startSearch, initSearch } from "./redux/searchRedux/searchAction";
import AndroidNotificationSettings from "rn-android-notification-settings";
// const socketIOClient = require("socket.io-client");

// const Tab = createMaterialBottomTabNavigator();
import "./config.js";
import "./notif.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IncomingCall } from "./screens/IncomingCall";
import { echoNode } from "./redux/nodeRedux/nodeAction";
import { Auth } from "./screens/Auth";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import PushNotification from "react-native-push-notification";
import { Splash } from "./screens/Splash";
const { PeerClient } = require("./peer.js");
const Stack = createStackNavigator();

const sleep = async (delay) => await new Promise((r) => setTimeout(r, delay));
const veryIntensiveTask = async (taskDataArguments) => {
  // Example of an infinite loop task
  const { delay } = taskDataArguments;
  await new Promise(async (resolve) => {
    for (let i = 0; BackgroundService.isRunning(); i++) {
      // console.log("running", i);
      await sleep(delay);
    }
  });
};

const options = {
  taskName: "IntraLAN Comm",
  taskTitle: global.config.appTitle,
  taskDesc: "Fast, Reliable, Secure",
  taskIcon: {
    name: "ic_launcher",
    type: "mipmap",
  },
  color: "#ffffff",
  linkingURI: "intralancom://settings",
  parameters: {
    delay: 1000,
  },
};
const rangeString = "192.168.1.0/24";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      connections: {},
      info: {},
      interval: -1,
      count: 0,
      search: false,
      appState: AppState.currentState,
      block: "",
      ips: [],
      waitTime: 1000,
      permissions: [
        { permission: PermissionsAndroid.PERMISSIONS.CAMERA, title: "Camera" },
        {
          permission: PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          title: "Microphone",
        },
      ],
    };
    Linking.addEventListener("url", this.handleIncomingEvents);
  }
  createChannels = () => {
    PushNotification.createChannel(
      {
        channelId: "message-channel", // (required)
        channelName: `Message channel`, // (required)
        channelDescription: "channel for sending messages", // (optional) default: undefined.
        soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
        importance: 4, // (optional) default: 4. Int value of the Android notification importance
        vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
      },
      (created) =>
        console.log(`createChannel 'message-channel' returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
    );
    PushNotification.createChannel(
      {
        channelId: "file-channel", // (required)
        channelName: `File channel`, // (required)
        channelDescription: "channel for file transfer", // (optional) default: undefined.
        soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
        importance: 4, // (optional) default: 4. Int value of the Android notification importance
        vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
      },
      (created) =>
        console.log(`createChannel 'file-channel' returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
    );
    PushNotification.createChannel(
      {
        channelId: "call-channel", // (required)
        channelName: `Call channel`, // (required)
        channelDescription: "channel for calls", // (optional) default: undefined.
        soundName: "default", // (optional) See `soundName` parameter of `localNotification` function
        importance: 4, // (optional) default: 4. Int value of the Android notification importance
        vibrate: true, // (optional) default: true. Creates the default vibration patten if true.
      },
      (created) =>
        console.log(`createChannel 'call-channel' returned '${created}'`) // (optional) callback returns whether the channel was created, false means it already existed.
    );
  };
  handleIncomingEvents = (evt) => {
    console.log(evt.url);
    // if (evt.url.includes("settings")) {
    //   global.config.navigationRef.current.navigate({
    //     name: "Home",
    //     key: "Home",
    //     params: { target: "Settings" },
    //   });
    // }
    // Linking.openSettings();

    // AndroidNotificationSettings.openNotificationSettings();

    // Linking.openURL("app-settings://notification/com.vasusharma7.intralan");
  };
  componentWillUnmount() {
    clearInterval(this.state.interval);
  }

  // shouldComponentUpdate(props, state) {
  //   if (this.state.search !== props.search && props.search === true) {
  //     console.log("changing things", props.search);
  //     this.setState({ search: props.search }, () => this.startSearch());
  //   }
  //   return true;
  // }
  requestPermissions = async () => {
    try {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Microphone Permission",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );
      if (granted === PermissionsAndroid.RESULTS.GRANTED) {
        console.log("You can use the Microphone");
        await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          PermissionsAndroid.PERMISSIONS.WRITE_EXTERNAL_STORAGE,
        ]).then((granted) => {
          if (granted["android.permission.READ_EXTERNAL_STORAGE"] === "granted")
            console.log("You can read storage");
          else console.log("You cannot read storage");

          if (
            granted["android.permission.WRITE_EXTERNAL_STORAGE"] === "granted"
          )
            console.log("You can write storage");
          else console.log("You cannot write storage");
        });
      } else {
        console.log("Microphone permission denied");
      }
    } catch (err) {
      console.warn(err);
    }
  };
  connectWithPeerJS = async () => {
    if (!this.props.localPeer) {
      try {
        console.log(this.props.localPeer);
        const peer = new PeerClient(null, "vasu_007");
        this.props.setLocalPeer(peer);
      } catch {
        console.log("this is the errro");
      }
    }
    // await AsyncStorage.getItem("localPeer").then((localPeer) => {
    //   if (localPeer) {
    //     localPeer = JSON.parse(localPeer);
    //     console.log("localpeer", localPeer);
    //     // localPeer.peer.reconnect();
    //     // const peer = new PeerClient(null, "vasu_007");
    //     // this.props.setLocalPeer(peer);
    //   }
    // });
  };
  async componentDidMount() {
    this.createChannels();
    // AsyncStorage.clear();

    this.requestPermissions();
    //check here if notifications are not working
    // if (!BackgroundService.isRunning())
    await BackgroundService.start(veryIntensiveTask, options);
    this.props.echoNode();
    // this.connectWithPeerJS();
    this.props.initSearch(rangeString);
    AppState.addEventListener("change", this._handleAppStateChange);
    // setInterval(() => global.config.fireMessageNotification(), 5000);
  }

  async componentWillUnmount() {
    AppState.removeEventListener("change", this._handleAppStateChange);
    await AsyncStorage.getItem("node").then((res) => {
      if (res) {
        res = JSON.parse(res);
        if (res.node === false) {
          BackgroundService.stop();
        }
      } else {
        BackgroundService.stop();
      }
    });
  }

  _handleAppStateChange = (nextAppState) => {
    if (
      this.state.appState.match(/inactive|background/) &&
      nextAppState === "active"
    ) {
      console.log("App has come to the foreground!");
      // this.setState({ block: rangeString }, this.handleBlockChange);
    } else {
      console.log("App has gone to background !");
      // clearInterval(this.state.interval);
      // this.setState({ interval: -1 });
    }
    this.setState({ appState: nextAppState });
  };

  render() {
    return (
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Auth" component={Auth} />
        <Stack.Screen name="Home" component={Home} />
      </Stack.Navigator>
    );
    // ) this.state.auth ? <Home /> : <Auth />;
  }
}
const mapStateToProps = (state) => {
  return {
    connections: state.data.connections,
    info: state.data.info,
    search: state.search.search,
    connStatus: state.data.connStatus,
    localPeer: state.stream.localPeer,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    updateConnections: (connections) =>
      dispatch(updateConnections(connections)),
    updateInfo: (info) => dispatch(updateInfo(info)),
    initSearch: (block) => dispatch(initSearch(block)),
    setLocalPeer: (peer) => dispatch(setLocalPeer(peer)),
    setRemotePeer: (peer) => dispatch(setRemotePeer(peer)),
    echoNode: () => dispatch(echoNode()),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(App);
