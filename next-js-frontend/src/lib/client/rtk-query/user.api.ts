import { FetchUserInfoResponse } from "@/lib/server/services/userService";
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { updateLoggedInUser } from "../slices/authSlice";
import { RootState } from "../store/store";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: fetchBaseQuery({
    baseUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/user`,
    credentials: "include",
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).authSlice.authToken;
      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }
      return headers;
    },
  }),

  endpoints: (builder) => ({
    /**
     * ✅ Supports:
     * - Uploading avatar (FormData)
     * - Updating name/username
     * - Resetting avatar to DEFAULT_AVATAR via { avatarReset: true }
     */
    updateProfile: builder.mutation<
      FetchUserInfoResponse,
      FormData | { avatarReset: boolean; name?: string; username?: string }
    >({
      query: (data) => {
        // If resetting avatar → send JSON body
        if (!(data instanceof FormData) && data.avatarReset) {
          return {
            url: "/",
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          };
        }

        // Otherwise, handle normal FormData update
        return {
          url: "/",
          method: "PATCH",
          body: data,
        };
      },

      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data: updatedUser } = await queryFulfilled;
          dispatch(updateLoggedInUser(updatedUser));
        } catch (err) {
          console.error("Profile update failed:", err);
        }
      },
    }),
  }),
});

export const { useUpdateProfileMutation } = userApi;
