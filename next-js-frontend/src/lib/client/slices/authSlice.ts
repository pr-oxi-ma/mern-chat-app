import { FetchUserInfoResponse } from "@/lib/server/services/userService";
import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { RootState } from "../store/store";

type InitialState = {
  loggedInUser: FetchUserInfoResponse | null;
  authToken: string | null;
};

// Instantly load token from localStorage on app start
const initialState: InitialState = {
  loggedInUser: null,
  authToken:
    typeof window !== "undefined" ? localStorage.getItem("authToken") : null,
};

const authSlice = createSlice({
  name: "authSlice",
  initialState,
  reducers: {
    updateLoggedInUser: (
      state,
      action: PayloadAction<FetchUserInfoResponse | null>
    ) => {
      state.loggedInUser = action.payload;
    },
    updateLoggedInUserPublicKey: (
      state,
      action: PayloadAction<Required<Pick<FetchUserInfoResponse, "publicKey">>>
    ) => {
      if (state.loggedInUser)
        state.loggedInUser.publicKey = action.payload.publicKey;
    },
    updateLoggedInUserNotificationStatus: (
      state,
      action: PayloadAction<boolean>
    ) => {
      if (state.loggedInUser)
        state.loggedInUser.notificationsEnabled = action.payload;
    },
    setAuthToken: (state, action: PayloadAction<string | null>) => {
      state.authToken = action.payload;
      if (action.payload)
        localStorage.setItem("authToken", action.payload);
      else
        localStorage.removeItem("authToken");
    },
  },
});

export const selectLoggedInUser = (state: RootState) =>
  state.authSlice.loggedInUser;
export const selectAuthToken = (state: RootState) =>
  state.authSlice.authToken;

export const {
  updateLoggedInUser,
  updateLoggedInUserPublicKey,
  updateLoggedInUserNotificationStatus,
  setAuthToken,
} = authSlice.actions;

export default authSlice;
