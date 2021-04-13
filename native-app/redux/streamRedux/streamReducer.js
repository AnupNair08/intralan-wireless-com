import {
  LOCAL_PEER,
  REMOTE_PEER,
  AV_STREAM,
  STREAM_INIT,
  FILE_PROGRESS,
} from "./streamActionTypes";

const initalState = {
  remotePeer: null,
  localPeer: null,
  stream: null,
  streamInit: null,
  fileProgress: 0,
};

export const streamReducer = (state = initalState, action) => {
  switch (action.type) {
    case STREAM_INIT: {
      return {
        ...state,
        streamInit: action.payload,
        fileProgress: 0,
      };
    }
    case FILE_PROGRESS: {
      return {
        ...state,
        fileProgress: action.payload,
      };
    }
    case LOCAL_PEER: {
      return {
        ...state,
        localPeer: action.payload,
      };
    }
    case REMOTE_PEER: {
      return {
        ...state,
        remotePeer: action.payload,
      };
    }
    case AV_STREAM: {
      return {
        ...state,
        stream: action.payload,
      };
    }
    default:
      return state;
  }
};
export default streamReducer;
