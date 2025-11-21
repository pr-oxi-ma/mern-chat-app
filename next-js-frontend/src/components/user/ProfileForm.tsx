import React, { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Cropper, { Area } from "react-easy-crop";
import imageCompression from "browser-image-compression";
import { motion, AnimatePresence } from "framer-motion";

import { useUpdateProfileMutation } from "@/lib/client/rtk-query/user.api";
import { ACCEPTED_IMAGE_TYPES, DEFAULT_AVATAR } from "../../constants";
import { useToast } from "../../hooks/useUI/useToast";
import { selectLoggedInUser } from "../../lib/client/slices/authSlice";
import { useAppSelector } from "../../lib/client/store/hooks";
import { formatRelativeTime } from "../../lib/shared/helpers";
import PencilIcon from "../ui/icons/PencilIcon";
import { VerificationBadgeIcon } from "../ui/icons/VerificationBadgeIcon";

/**
 * Simple Spinner Component for Input Fields
 */
const SpinnerIcon = () => (
  <svg
    className="animate-spin h-5 w-5 text-blue-500"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    ></path>
  </svg>
);

export const ProfileForm: React.FC = () => {
  const loggedInUser = useAppSelector(selectLoggedInUser);

  const [updateProfileTrigger, { error, isError, isLoading, isSuccess, isUninitialized }] =
    useUpdateProfileMutation();

  useToast({
    error,
    isError,
    isLoading,
    isSuccess,
    isUninitialized,
    loaderToast: true,
    successMessage: "Profile Updated",
    successToast: true,
    loadingMessage: "Updating Profile",
  });

  // form fields
  const [name, setName] = useState<string>(loggedInUser?.name || "");
  const [nameError, setNameError] = useState<string | null>(null);

  const [username, setUsername] = useState<string>(loggedInUser?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [isCheckingUsername, setIsCheckingUsername] = useState<boolean>(false);

  // avatar preview & upload blob/file
  const [preview, setPreview] = useState<string>(loggedInUser?.avatar || DEFAULT_AVATAR);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); 
  const [resetToDefault, setResetToDefault] = useState<boolean>(false);

  // ref to last object URL so we can revoke it and avoid leaks
  const lastObjectUrlRef = useRef<string | null>(null);

  // edit toggle control (pencil)
  const [editingField, setEditingField] = useState<"name" | "username" | "avatar" | null>(null);

  // unsaved changes guard
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // cropper modal states
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const tempImageSrcRef = useRef<string | null>(null); 

  // new state: show crop button after upload until update
  const [showCropButton, setShowCropButton] = useState<boolean>(false);

  // keep in sync if loggedInUser changes externally
  useEffect(() => {
    setName(loggedInUser?.name || "");
    setUsername(loggedInUser?.username || "");
    setPreview(loggedInUser?.avatar || DEFAULT_AVATAR);
    setAvatarFile(null);
    setResetToDefault(false);
    setEditingField(null);
    setShowCropButton(false);
    setNameError(null);
    setUsernameError(null);
    setIsCheckingUsername(false);
    
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
  }, [loggedInUser]);

  // compute unsaved changes
  useEffect(() => {
    const changed =
      name !== (loggedInUser?.name || "") ||
      username !== (loggedInUser?.username || "") ||
      resetToDefault ||
      Boolean(avatarFile) ||
      (preview !== (loggedInUser?.avatar || DEFAULT_AVATAR) && preview !== DEFAULT_AVATAR);
    setHasUnsavedChanges(Boolean(changed));
  }, [name, username, preview, avatarFile, resetToDefault, loggedInUser]);

  // warn on page unload if unsaved
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [hasUnsavedChanges]);

  // ---------- REAL-TIME USERNAME CHECK ----------
  useEffect(() => {
    if (!username || username.length < 3) {
      setIsCheckingUsername(false);
      return;
    }

    if (username === loggedInUser?.username) {
      setIsCheckingUsername(false);
      if (usernameError === "Username is already taken") {
        setUsernameError(null);
      }
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsCheckingUsername(true);
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/auth/check-username?username=${username}`
        );
        const data = await res.json();

        if (!data.available) {
          setUsernameError(data.message || "Username is already taken");
        } else {
          setUsernameError(null);
        }
      } catch (error) {
        console.error("Error checking username availability", error);
      } finally {
        setIsCheckingUsername(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [username, loggedInUser, usernameError]);

  // ---------- Name Field Logic ----------
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    let errorMsg = null;

    const invalidCharRegex = /[^a-zA-Z\s'’]/;
    if (invalidCharRegex.test(val)) {
      errorMsg = "Emojis, symbols, numbers are not supported";
    }

    val = val.replace(/[^a-zA-Z\s'’]/g, "");
    if (val.startsWith(" ")) val = val.trimStart();
    val = val.replace(/\s\s+/g, " ");
    if (val.length > 25) val = val.slice(0, 25);
    val = val.replace(/(?:^|\s|['’])[a-z]/g, (letter) => letter.toUpperCase());
    val = val.replace(/\bMc([a-z])/g, (_, char) => `Mc${char.toUpperCase()}`);
    val = val.replace(/\bO(['’])([a-z])/g, (_, apostrophe, char) => `O${apostrophe}${char.toUpperCase()}`);

    setName(val);
    setNameError(errorMsg);
  };

  const handleNameBlur = () => {
    setName((prev) => prev.trim());
  };

  // ---------- Image selection & cropping ----------
  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      alert("Unsupported image type. Use JPG or PNG.");
      return;
    }

    const threeMB = 3 * 1024 * 1024;
    if (file.size > threeMB) {
      alert("Image too large. Please select an image under 3MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      tempImageSrcRef.current = String(reader.result);
      setPreview(String(reader.result));
      setShowCropper(true);
      setEditingField("avatar");
      setResetToDefault(false);
      setShowCropButton(true);
    };
    reader.readAsDataURL(file);
    e.currentTarget.value = "";
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const getCroppedBlob = async (): Promise<Blob | null> => {
    if (!tempImageSrcRef.current || !croppedAreaPixels) return null;
    const image = await createImage(tempImageSrcRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(croppedAreaPixels.width * ratio);
    canvas.height = Math.round(croppedAreaPixels.height * ratio);
    ctx.scale(ratio, ratio);

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height
    );

    return new Promise<Blob | null>((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92)
    );
  };

  const createImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new window.Image(); 
      img.crossOrigin = "anonymous";
      const timeout = setTimeout(() => {
        reject(new Error("Image loading timeout"));
      }, 10000);
      img.onload = () => {
        clearTimeout(timeout);
        resolve(img);
      };
      img.onerror = (e) => {
        clearTimeout(timeout);
        reject(e);
      };
      img.src = src;
    });

  const applyCropAndCompress = async () => {
    const blob = await getCroppedBlob();
    if (!blob) {
      setShowCropper(false);
      return;
    }
    const fileFromBlob = new File([blob], "avatar.jpg", { type: blob.type });

    try {
      const options = {
        maxSizeMB: 1, 
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileFromBlob, options);

      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }

      const objUrl = URL.createObjectURL(compressedFile);
      lastObjectUrlRef.current = objUrl;

      setAvatarFile(compressedFile);
      setPreview(objUrl);
      setShowCropper(false);
      tempImageSrcRef.current = null;
      setResetToDefault(false);
    } catch {
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
      const objUrl = URL.createObjectURL(fileFromBlob);
      lastObjectUrlRef.current = objUrl;

      setAvatarFile(fileFromBlob);
      setPreview(objUrl);
      setShowCropper(false);
      tempImageSrcRef.current = null;
      setResetToDefault(false);
    }
  };

  const handleResetAvatar = () => {
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }
    setPreview(DEFAULT_AVATAR);
    setAvatarFile(null);
    setResetToDefault(true);
    setEditingField("avatar");
    setShowCropButton(false);
  };

  const toggleEdit = (field: "name" | "username" | "avatar") =>
    setEditingField((curr) => (curr === field ? null : field));

  // ---------- Save / update ----------
  const handleUpdateProfile = async () => {
    if (isCheckingUsername) return;

    setUsernameError(null);
    setNameError(null);

    const trimmedName = name.trim();
    if (/[^a-zA-Z\s'’]/.test(trimmedName)) {
      setNameError("Emojis, symbols, numbers are not supported");
      return;
    }
    if (trimmedName.length < 3) {
      setNameError("Name must be at least 3 letters.");
      return;
    }

    if (!username || username.trim().length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }
    
    if (username !== loggedInUser?.username && usernameError) {
      return; 
    }

    const formData = new FormData();
    formData.append("name", trimmedName);
    formData.append("username", username);

    if (resetToDefault) {
      formData.append("avatarReset", "true");
    } else if (avatarFile) {
      formData.append("avatar", avatarFile, avatarFile.name);
    }

    try {
      await updateProfileTrigger(formData).unwrap();
      setAvatarFile(null);
      setResetToDefault(false);
      setEditingField(null);
      setHasUnsavedChanges(false);
      setShowCropButton(false);
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    } catch (err: any) {
      const msg = err?.data?.message || err?.message || "";
      if (String(msg).toLowerCase().includes("username")) {
        setUsernameError("Username already taken");
      } else {
        alert(msg || "Failed to update profile");
      }
    }
  };

  if (!loggedInUser) {
    return <div className="animate-pulse w-full max-w-md h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />;
  }

  return (
    <div className="p-4 max-w-2xl mx-auto text-gray-900 dark:text-gray-100 relative">
      
      <div className="flex flex-col items-center gap-y-4">
        {/* Avatar area */}
        <div
          className="relative"
          role="button"
          tabIndex={0}
          onClick={() => {
            const el = document.getElementById("avatar-file-input") as HTMLInputElement | null;
            if (el) el.click();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              const el = document.getElementById("avatar-file-input") as HTMLInputElement | null;
              if (el) el.click();
            }
          }}
        >
          <div className="w-40 h-40 rounded-full overflow-hidden border shadow-sm cursor-pointer">
            <Image
              src={preview}
              alt={name || "avatar"}
              width={500}
              height={500}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <div className="absolute right-0 bottom-0 transform translate-x-1/4 translate-y-1/4">
            <PencilIcon
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                toggleEdit("avatar");
                const el = document.getElementById("avatar-file-input") as HTMLInputElement | null;
                if (el) el.click();
              }}
              className="p-1 rounded-md bg-background"
              title="Edit avatar"
            />
          </div>
        </div>

        <input
          id="avatar-file-input"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={onSelectImage}
          className="hidden"
        />

        {showCropButton && (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={() => {
                if (preview && preview !== DEFAULT_AVATAR) {
                  tempImageSrcRef.current = preview;
                  setShowCropper(true);
                  setEditingField("avatar");
                } else {
                  const el = document.getElementById("avatar-file-input") as HTMLInputElement | null;
                  el?.click();
                }
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm shadow"
            >
              Crop
            </button>
          </div>
        )}

        {preview !== DEFAULT_AVATAR && (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleResetAvatar();
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm shadow"
            >
              Reset Profile
            </button>
          </div>
        )}

        {/* Name field */}
        <div className="w-full max-w-md relative">
          <label htmlFor="name" className="mt-1 text-sm font-medium text-text">
            Name
          </label>
          <div className="relative">
            <input
              id="name"
              value={name}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onFocus={() => setEditingField("name")}
              disabled={isLoading}
              className={`mt-1 block p-3 rounded w-full outline outline-1 text-text bg-background pr-16 
                ${nameError ? "outline-red-500 ring-1 ring-red-500/20" : 
                  editingField === "name" ? "outline-primary ring-1 ring-primary/30" : "outline-secondary-darker"
                }`}
              aria-label="Name"
              aria-invalid={!!nameError}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            <div className="absolute right-8 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {name.length}/25
            </div>
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <PencilIcon
                onClick={() => toggleEdit("name")}
                title={editingField === "name" ? "Stop editing name" : "Edit name"}
                className="p-1 rounded-md bg-background"
              />
            </div>
          </div>
          {nameError && (
            <p id="name-error" role="alert" className="mt-1 text-sm text-red-500 dark:text-red-400">
              {nameError}
            </p>
          )}
        </div>

        {/* Username field */}
        <div className="w-full max-w-md relative">
          <label htmlFor="username" className="mt-1 text-sm font-medium text-text">
            Username
          </label>

          <p className="mt-1 text-xs text-secondary-darker">
            Only lowercase letters, numbers and underscores. No spaces.
          </p>

          <div className="relative">
            <input
              id="username"
              value={username}
              onChange={(e) => {
                const cleaned = e.target.value
                  .toLowerCase()
                  .replace(/\s/g, "")
                  .replace(/[^a-z0-9_]/g, "");
                setUsername(cleaned);
                setUsernameError(null); 
              }}
              onKeyDown={(e) => {
                if (e.key === " ") e.preventDefault();
              }}
              onPaste={(e) => {
                e.preventDefault();
                const text = e.clipboardData.getData("text");
                const cleaned = text.toLowerCase().replace(/\s/g, "").replace(/[^a-z0-9_]/g, "");
                const el = e.target as HTMLInputElement;
                const newVal = (el.value + cleaned).toLowerCase().replace(/[^a-z0-9_]/g, "");
                setUsername(newVal);
              }}
              onFocus={() => setEditingField("username")}
              disabled={isLoading}
              aria-invalid={!!usernameError}
              aria-describedby={usernameError ? "username-error" : undefined}
              className={`mt-1 p-3 rounded w-full outline outline-1 outline-secondary-darker text-text bg-background transition pr-10 
                ${ usernameError ? "outline-red-500 ring-1 ring-red-500/20" : editingField === "username" ? "outline-primary ring-1 ring-primary/30" : "outline-secondary-darker" }`}
            />

            {/* Loader or Pencil Icon inside input */}
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              {isCheckingUsername ? (
                <SpinnerIcon />
              ) : (
                <PencilIcon
                  onClick={() => toggleEdit("username")}
                  title={editingField === "username" ? "Stop editing username" : "Edit username"}
                  className="p-1 rounded-md bg-background"
                />
              )}
            </div>
          </div>

          {usernameError ? (
            <p id="username-error" role="alert" className="mt-1 text-sm text-red-500 dark:text-red-400">
              {usernameError}
            </p>
          ) : (
            <div className="flex items-center justify-center gap-x-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span>@{loggedInUser.username}</span>
              {loggedInUser.verificationBadge && <VerificationBadgeIcon />}
            </div>
          )}
        </div>

        <p className="text-sm text-secondary-darker">
          Joined {formatRelativeTime(JSON.stringify(new Date(loggedInUser.createdAt)))}
        </p>

        {/* Update Actions */}
        {hasUnsavedChanges && (
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={() => {
                if (lastObjectUrlRef.current) {
                  URL.revokeObjectURL(lastObjectUrlRef.current);
                  lastObjectUrlRef.current = null;
                }
                setName(loggedInUser.name);
                setUsername(loggedInUser.username);
                setPreview(loggedInUser.avatar || DEFAULT_AVATAR);
                setAvatarFile(null);
                setResetToDefault(false);
                setEditingField(null);
                setShowCropButton(false);
                setUsernameError(null);
                setNameError(null);
                setHasUnsavedChanges(false);
                setShowCropper(false);
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-md shadow"
            >
              Reset Changes
            </button>

            <button
              onClick={handleUpdateProfile}
              disabled={isLoading || isCheckingUsername || !!usernameError}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-500-dark rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Updating..." : isCheckingUsername ? "Checking Username..." : "Update profile"}
            </button>
          </div>
        )}
      </div>

      {/* Crop Modal */}
      <AnimatePresence>
        {showCropper && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              onClick={() => setShowCropper(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.98, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              className="relative z-50 w-full max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-xl p-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Crop avatar</h3>
                <button
                  onClick={() => setShowCropper(false)}
                  className="p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label="Close crop"
                >
                  ✕
                </button>
              </div>

              <div className="w-full h-80 relative bg-gray-50 dark:bg-gray-800 rounded-md overflow-hidden">
                <Cropper
                  image={preview}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <input
                  aria-label="Zoom"
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full"
                />
                <button
                  onClick={() => {
                    setCrop({ x: 0, y: 0 });
                    setZoom(1);
                  }}
                  className="px-3 py-1 border rounded-md"
                >
                  Reset
                </button>
                <div className="ml-auto flex gap-2">
                  <button onClick={() => setShowCropper(false)} className="px-4 py-2 border rounded-md">
                    Cancel
                  </button>
                  <button onClick={async () => { await applyCropAndCompress(); setShowCropButton(true); }} className="px-4 py-2 bg-blue-500 text-white text-sm rounded-md shadow">
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileForm;