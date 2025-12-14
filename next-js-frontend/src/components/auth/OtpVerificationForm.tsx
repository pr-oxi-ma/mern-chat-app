'use client';
import { verifyOtp } from "@/actions/auth.actions";
import {
  otpVerificationSchema,
  otpVerificationSchemaType,
} from "@/lib/shared/zod/schemas/auth.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useState } from "react"; // <-- Added useState
// Removed: import { useFormStatus } from "react-dom";
import { SubmitHandler, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";

type PropTypes = {
  loggedInUserId:string
}

export const OtpVerificationForm = ({loggedInUserId}:PropTypes) => {

  const [state,verifyOtpAction] = useActionState(verifyOtp,undefined);
  // 1. Manual pending state
  const [isPending, setIsPending] = useState(false);

  const router = useRouter();

  useEffect(()=>{
    // 3. Set pending to false when the action completes
    setIsPending(false);
    
    if(state?.errors.message?.length) toast.error(state.errors.message);
    if(state?.success.message?.length){
      toast.success(state.success.message);
      router.push("/");
    }
  },[router, state]);

  const {register,handleSubmit,formState: { errors }} = useForm<otpVerificationSchemaType>({resolver: zodResolver(otpVerificationSchema)});

  const onSubmit: SubmitHandler<otpVerificationSchemaType> = ({ otp }) => {
    // 2. Set pending to true before starting the action
    setIsPending(true);

    startTransition(()=>{
      verifyOtpAction({otp,loggedInUserId});
    })
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <input {...register("otp")} maxLength={4} type={'text'} className="p-3 rounded outline outline-1 outline-secondary-dark text-text bg-background hover:outline-primary" placeholder={"Enter your OTP"}/>
        {errors.otp?.message && <p className="text-red-500 text-sm">{errors.otp?.message}</p>}
      </div>
      {/* 4. Pass the manual pending state */}
      <SubmitButton pending={isPending}/>
    </form>
  );
};

// Updated SubmitButton to accept the pending prop
function SubmitButton({ pending }: { pending: boolean }){
  // Removed: const {pending} = useFormStatus();
  return (
    <button
    disabled={pending}
    type="submit"
    className={`${pending?"bg-transparent":"bg-primary"} px-6 py-2 rounded-sm`}
  >
    {pending?<CircleLoading/>:"Verify OTP"}
  </button>
  )
}