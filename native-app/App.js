import React, { Component } from "react";
import { createMaterialBottomTabNavigator } from "@react-navigation/material-bottom-tabs";
import { PermissionsAndroid, AppState, Linking } from "react-native";
import { connect } from "react-redux";
import { updateConnections, updateInfo } from "./redux/dataRedux/dataAction";
import { setLocalPeer, setRemotePeer } from "./redux/streamRedux/streamAction";
import Home from "./screens/Home";
import { startSearch, initSearch } from "./redux/searchRedux/searchAction";
// const socketIOClient = require("socket.io-client");
// const Tab = createMaterialBottomTabNavigator();
import "./config.js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { IncomingCall } from "./screens/IncomingCall";
import { echoNode } from "./redux/nodeRedux/nodeAction";
import { Auth } from "./screens/Auth";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { Splash } from "./screens/Splash";
const { PeerClient } = require("./peer.js");

const Stack = createStackNavigator();

const sleep = async (delay) => await new Promise((r) => setTimeout(r, delay));

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
    // Linking.addEventListener("url", this.handleOpenURL);
  }
  // handleOpenURL = (evt) => {
  //   // Will be called when the notification is pressed
  //   console.log(evt.url);
  //   // do something
  // };
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
    // AsyncStorage.clear();

    this.requestPermissions();

    this.props.echoNode();
    // this.connectWithPeerJS();
    this.props.initSearch(rangeString);
    AppState.addEventListener("change", this._handleAppStateChange);
  }

  componentWillUnmount() {
    AppState.removeEventListener("change", this._handleAppStateChange);
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
