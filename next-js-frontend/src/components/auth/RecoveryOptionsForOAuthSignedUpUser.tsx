import { sendPrivateKeyRecoveryEmail } from "@/actions/auth.actions";
import { useStoreLoggedInUserInfoInLocalStorageIfRecoveryEmailSentSuccessful } from "@/hooks/useAuth/useStoreLoggedInUserInfoInLocalStorageIfRecoveryEmailSentSuccessful";
import { User } from "@/interfaces/auth.interface";
import { startTransition, useActionState, useCallback, useEffect, useState } from "react"; // <-- Added useState
// Removed: import { useFormStatus } from "react-dom";
import toast from "react-hot-toast";
import { CircleLoading } from "../shared/CircleLoading";

type PropTypes = {
  loggedInUser: User;
};

export const RecoveryOptionsForOAuthSignedUpUser = ({loggedInUser}:PropTypes) => {

  const [state,sendPrivateKeyRecoveryEmailAction] = useActionState(sendPrivateKeyRecoveryEmail,undefined);
  // 1. Manual pending state
  const [isPending, setIsPending] = useState(false);

  useStoreLoggedInUserInfoInLocalStorageIfRecoveryEmailSentSuccessful({isPrivateKeyRecoveryEmailSentSuccessful:state?.success.message?.length ? true : false,loggedInUser});

  useEffect(()=>{
    // 3. Set pending to false when the action completes
    setIsPending(false);

    if(state && state.errors.message){
      toast.error(state.errors.message);
    }
  },[state])

  const handleSubmit = useCallback(() => {
    // 2. Set pending to true before starting the action
    setIsPending(true);
    
    startTransition(()=>{
      sendPrivateKeyRecoveryEmailAction({ 
        email: loggedInUser.email, 
        id: loggedInUser.id, 
        username: loggedInUser.username 
      });
    })
  }, [loggedInUser]); 
  

  return (
      state?.success.message ? (
        <h2 className="text font-bold bg-background p-4 rounded-md">
          We have sent an verification email, please check spam if not received
        </h2>
      ) : (
        <form onSubmit={(e)=>{e.preventDefault(); handleSubmit()}} className="flex justify-center">
          {/* 4. Pass the manual pending state */}
          <SubmitButton pending={isPending}/>
        </form>
      )
  );
};

// Updated SubmitButton to accept the pending prop
function SubmitButton({ pending }: { pending: boolean }){
  
  // Removed: const {pending} = useFormStatus();
  
  return (
    <button
      disabled={pending}
      type="submit"
      className="bg-primary px-14 py-2 self-center rounded-sm"
    >
    {pending ? <CircleLoading size="6" /> : "Initiate private key recovery"}
  </button>
  )
}