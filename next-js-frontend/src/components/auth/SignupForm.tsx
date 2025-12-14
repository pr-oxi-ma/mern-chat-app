"use client";
import { signup } from "@/actions/auth.actions";
import { useConvertPrivateAndPublicKeyInJwkFormat } from "@/hooks/useAuth/useConvertPrivateAndPublicKeyInJwkFormat";
import { useEncryptPrivateKeyWithUserPassword } from "@/hooks/useAuth/useEncryptPrivateKeyWithUserPassword";
import { useGenerateKeyPair } from "@/hooks/useAuth/useGenerateKeyPair";
import { useStoreUserKeysInDatabase } from "@/hooks/useAuth/useStoreUserKeysInDatabase";
import { useStoreUserPrivateKeyInIndexedDB } from "@/hooks/useAuth/useStoreUserPrivateKeyInIndexedDB";
import { useUpdateLoggedInUserPublicKeyInState } from "@/hooks/useAuth/useUpdateLoggedInUserPublicKeyInState";
import type { signupSchemaType } from "@/lib/shared/zod/schemas/auth.schema";
import { signupSchema } from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react";
// Removed: import { useFormStatus } from "react-dom";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";
import { AuthRedirectLink } from "./AuthRedirectLink";

export const SignupForm = () => {
  const [state, signupAction] = useActionState(signup, undefined);
  const router = useRouter();

  const [nameValue, setNameValue] = useState("");
  const [usernameValue, setUsernameValue] = useState("");
  // 1. Manual pending state
  const [isPending, setIsPending] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<signupSchemaType>({ resolver: zodResolver(signupSchema) });

  const password = watch("password");

  useEffect(() => {
    // 3. Set pending to false when the action completes
    setIsPending(false); 
    
    if (state?.errors?.message) {
      toast.error(state.errors.message);
    }
  }, [state, router]);

  const { privateKey, publicKey } = useGenerateKeyPair({ user: state?.data });
  const { privateKeyJWK, publicKeyJWK } = useConvertPrivateAndPublicKeyInJwkFormat({
    privateKey,
    publicKey,
  });
  const { encryptedPrivateKey } = useEncryptPrivateKeyWithUserPassword({
    password,
    privateKeyJWK,
  });
  const { publicKeyReturnedFromServerAfterBeingStored } = useStoreUserKeysInDatabase({
    encryptedPrivateKey,
    publicKeyJWK,
    loggedInUserId: state?.data?.id,
  });
  useStoreUserPrivateKeyInIndexedDB({ privateKey: privateKeyJWK, userId: state?.data?.id });
  useUpdateLoggedInUserPublicKeyInState({ publicKey: publicKeyReturnedFromServerAfterBeingStored });

// Live formatting function (updated version)
const formatName = (val: string) => {
  // Remove unsupported characters
  val = val.replace(/[^a-zA-Z\s'’]/g, "");

  // Trim leading space if any
  if (val.startsWith(" ")) val = val.trimStart();

  // Collapse multiple spaces
  val = val.replace(/\s\s+/g, " ");

  // Limit length to 25 characters
  if (val.length > 25) val = val.slice(0, 25);

  // Capitalize first letter of each word
  val = val.replace(/(?:^|\s|['’])[a-z]/g, (letter) => letter.toUpperCase());

  // Handle special cases: McX and O’X
  val = val.replace(/\bMc([a-z])/g, (_, char) => `Mc${char.toUpperCase()}`);
  val = val.replace(/\bO(['’])([a-z])/g, (_, apostrophe, char) => `O${apostrophe}${char.toUpperCase()}`);

  return val;
};

  const formatUsername = (val: string) => {
    let username = val.toLowerCase();
    username = username.replace(/\s/g, "");
    username = username.replace(/[^a-z0-9_]/g, "");
    return username;
  };

  const onSubmit: SubmitHandler<signupSchemaType> = (data) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { confirmPassword, ...credentials } = data;

    const formData = new FormData();
    formData.append("name", nameValue);
    formData.append("username", usernameValue);
    formData.append("email", credentials.email);
    formData.append("password", credentials.password);

    // 2. Set pending to true before starting the action
    setIsPending(true); 

    startTransition(() => {
      signupAction(formData);
    });
  };

  return (
    <form className="flex flex-col gap-y-6" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-y-4">
        <div className="flex flex-col gap-y-1">
          <input
            {...register("name")}
            value={nameValue}
            onChange={(e) => setNameValue(formatName(e.target.value))}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Name"
          />
          {errors.name?.message && (
            <p className="text-red-500 text-sm">{errors.name?.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-y-1">
          <input
            {...register("username")}
            value={usernameValue}
            onChange={(e) => setUsernameValue(formatUsername(e.target.value))}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Username"
          />
          {errors.username?.message && (
            <p className="text-red-500 text-sm">{errors.username?.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-y-1">
          <input
            {...register("email")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Email"
          />
          {errors.email?.message && (
            <p className="text-red-500 text-sm">{errors.email?.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-y-1">
          <input
            type="password"
            {...register("password")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Password"
          />
          {errors.password?.message && (
            <p className="text-red-500 text-sm">{errors.password?.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-y-1">
          <input
            type="password"
            {...register("confirmPassword")}
            className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary"
            placeholder="Confirm Password"
          />
          {errors.confirmPassword?.message && (
            <p className="text-red-500 text-sm">{errors.confirmPassword?.message}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-y-6">
        <div className="flex flex-col gap-y-2">
          {/* 4. Pass the manual pending state */}
          <SubmitButton pending={isPending} />
        </div>
        <AuthRedirectLink pageName="Login" text="Already a member?" to="auth/login" />
      </div>
    </form>
  );
};

// Updated SubmitButton to accept the pending prop
function SubmitButton({ pending }: { pending: boolean }) {
  // Removed: const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      type="submit"
      className={`w-full ${pending ? "bg-background" : "bg-primary"} text-white px-6 py-3 rounded shadow-lg font-medium text-center flex justify-center`}
    >
      {pending ? <CircleLoading size="6" /> : "Signup"}
    </button>
  );
}