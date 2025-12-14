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
 * ProfileForm
 * - Crop/Compress avatar (react-easy-crop + browser-image-compression)
 * - Reset to DEFAULT_AVATAR (preview locally; backend updated only on Save)
 * - Pencil icons to toggle edit mode for name/username/avatar (floats right)
 * - Uses your useToast hook and RTK mutation
 */

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
  const [username, setUsername] = useState<string>(loggedInUser?.username || "");
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // avatar preview & upload blob/file
  const [preview, setPreview] = useState<string>(loggedInUser?.avatar || DEFAULT_AVATAR);
  const [avatarFile, setAvatarFile] = useState<File | null>(null); // final file to send
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
  const tempImageSrcRef = useRef<string | null>(null); // dataURL for cropper source

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
    // clear any object url we created previously
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

  // ---------- Image selection & cropping ----------
  const onSelectImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      // friendly alert — you may replace with toast hook
      alert("Unsupported image type. Use JPG or PNG.");
      return;
    }

    const threeMB = 3 * 1024 * 1024;
    if (file.size > threeMB) {
      alert("Image too large. Please select an image under 3MB.");
      return;
    }

    // prepare preview for cropper
    const reader = new FileReader();
    reader.onload = () => {
      tempImageSrcRef.current = String(reader.result);
      // set preview to the uploaded raw image so cropper shows it
      setPreview(String(reader.result));
      setShowCropper(true);
      setEditingField("avatar");
      setResetToDefault(false);
      // Show crop button after an upload — per request
      setShowCropButton(true);
      // don't set avatarFile yet — will set after crop + compression
    };
    reader.readAsDataURL(file);

    // clear the input value so the same file can be re-selected if needed
    e.currentTarget.value = "";
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  // helper to create cropped blob from tempImageSrcRef and croppedAreaPixels
  const getCroppedBlob = async (): Promise<Blob | null> => {
    if (!tempImageSrcRef.current || !croppedAreaPixels) return null;
    const image = await createImage(tempImageSrcRef.current);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    // use device pixel ratio for quality
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

// utility: create image element from dataURL
const createImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image(); // ✅ FIXED: remove undefined params
    img.crossOrigin = "anonymous";

    const timeout = setTimeout(() => {
      reject(new Error("Image loading timeout"));
    }, 10000); // safety timeout (10s)

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

  // apply crop -> compress -> set avatarFile and preview
  const applyCropAndCompress = async () => {
    const blob = await getCroppedBlob();
    if (!blob) {
      setShowCropper(false);
      return;
    }

    // convert blob -> File (browser-image-compression expects File)
    const fileFromBlob = new File([blob], "avatar.jpg", { type: blob.type });

    try {
      const options = {
        maxSizeMB: 1, // target ~1MB
        maxWidthOrHeight: 1024,
        useWebWorker: true,
      };
      const compressedFile = await imageCompression(fileFromBlob, options);

      // revoke previous object url if any
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
      // fallback: use raw fileFromBlob
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

  // reset avatar locally to DEFAULT_AVATAR (backend only updated on Save)
  const handleResetAvatar = () => {
    // revoke any previous object URL
    if (lastObjectUrlRef.current) {
      URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = null;
    }

    setPreview(DEFAULT_AVATAR);
    setAvatarFile(null);
    setResetToDefault(true);
    setEditingField("avatar");
    // hiding crop button since preview is default now
    setShowCropButton(false);
  };

  // toggle editing via pencil icon
  const toggleEdit = (field: "name" | "username" | "avatar") =>
    setEditingField((curr) => (curr === field ? null : field));

  // ---------- Save / update ----------
  const handleUpdateProfile = async () => {
    setUsernameError(null);

    // client-side validation
    if (!name || name.trim().length < 2) {
      alert("Name must be at least 2 characters.");
      return;
    }
    if (!username || username.trim().length < 3) {
      setUsernameError("Username must be at least 3 characters.");
      return;
    }

    // build FormData
    const formData = new FormData();
    formData.append("name", name);
    formData.append("username", username);

    if (resetToDefault) {
      // backend checks avatarReset === "true" or boolean
      formData.append("avatarReset", "true");
    } else if (avatarFile) {
      formData.append("avatar", avatarFile, avatarFile.name);
    }

    try {
      await updateProfileTrigger(formData).unwrap();
      // success toasts handled by useToast hook
      setAvatarFile(null);
      setResetToDefault(false);
      setEditingField(null);
      setHasUnsavedChanges(false);
      // hide crop button after successful update
      setShowCropButton(false);
      // revoke any object url after successful upload (we don't need it anymore)
      if (lastObjectUrlRef.current) {
        URL.revokeObjectURL(lastObjectUrlRef.current);
        lastObjectUrlRef.current = null;
      }
    } catch (err: any) {
      // check for username taken
      const msg = err?.data?.message || err?.message || "";
      if (String(msg).toLowerCase().includes("username")) {
        setUsernameError("Username already taken");
      } else {
        // fallback alert
        alert(msg || "Failed to update profile");
      }
    }
  };

  // small UI: if not loggedInUser show skeleton
  if (!loggedInUser) {
    return <div className="animate-pulse w-full max-w-md h-48 bg-gray-200 dark:bg-gray-700 rounded-lg" />;
  }

  // ---------- Render ----------
  return (
    <div className="p-4 max-w-2xl mx-auto text-gray-900 dark:text-gray-100 relative">
      {/* Top-right close (replaces Cancel) - REMOVED per request */}
{/* removed top-right ✕ */}
      <div className="flex flex-col items-center gap-y-4">
        {/* Avatar area (clickable) */}
        <div
          className="relative"
          role="button"
          tabIndex={0}
          onClick={() => {
            // open file input programmatically when avatar area is clicked
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

          {/* floating pencil (bottom-right) - aligned center vertically*/}
          <div className="absolute right-0 bottom-0 transform translate-x-1/4 translate-y-1/4">
            <PencilIcon
              onClick={(e: React.MouseEvent) => {
                // avoid triggering parent click (which opens file dialog twice)
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

        {/* hidden file input */}
        <input
          id="avatar-file-input"
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          onChange={onSelectImage}
          className="hidden"
        />

        {/* Crop button - shown only after user uploads an image, centered above Reset */}
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

        {/* Reset to default - centered and blue. Only show if preview is not already default */}
        {preview !== DEFAULT_AVATAR && (
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={(e) => {
                // prevent parent avatar click from firing
                e.stopPropagation();
                handleResetAvatar();
              }}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm shadow"
            >
              Reset Profile.
            </button>
          </div>
        )}

        {/* Name field */}
        <div className="w-full max-w-md relative">
          <label htmlFor="name" className="mt-1 text-sm font-medium text-text">
            Name
          </label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setEditingField("name")}
            disabled={isLoading}
            className={`mt-1 block p-3 rounded w-full outline outline-1 outline-secondary-darker text-text bg-background 
  ${editingField === "name" ? "outline-primary ring-1 ring-primary/30" : "" }`}
            aria-label="Name"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <PencilIcon
              onClick={() => toggleEdit("name")}
              title={editingField === "name" ? "Stop editing name" : "Edit name"}
              className="p-1 rounded-md bg-background"
            />
          </div>
        </div>

        {/* Username field */}
        <div className="w-full max-w-md relative">
          <label htmlFor="username" className="mt-1 text-sm font-medium text-text">
            Username
          </label>

          {/* username rules message below the label and above the field */}
          <p className="mt-1 text-xs text-secondary-darker">
            Only lowercase letters, numbers and underscores. No spaces.
          </p>

          <input
            id="username"
            value={username}
            onChange={(e) => {
              // enforce: no spaces + lowercase + only a-z0-9_
              // replaced original .replace(/\s+/g, "") to avoid deletion bug by preventing spaces at input source
              const cleaned = e.target.value
                .toLowerCase()
                .replace(/\s/g, "") // remove single spaces, keep rest intact
                .replace(/[^a-z0-9_]/g, ""); // strip invalid chars
              setUsername(cleaned);
              setUsernameError(null);
            }}
            onKeyDown={(e) => {
              // prevent space character entirely so double-space doesn't cause issues
              if (e.key === " ") {
                e.preventDefault();
              }
            }}
            onPaste={(e) => {
              // sanitize pasted content to remove spaces and invalid chars
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
            className={`mt-1 p-3 rounded w-full outline outline-1 outline-secondary-darker text-text bg-background transition ${ usernameError ? "outline-red-500 ring-1 ring-red-500/20" : editingField === "username" ? "outline-primary ring-1 ring-primary/30" : "outline-secondary-darker" }`}
          />

          <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
            <PencilIcon
              onClick={() => toggleEdit("username")}
              title={editingField === "username" ? "Stop editing username" : "Edit username"}
              className="p-1 rounded-md bg-background"
            />
          </div>

          {usernameError ? (
            <p id="username-error" role="alert" className="mt-1 text-sm text-red-500 dark:text-red-400">
              {usernameError}
            </p>
          ) : (
            // Center the username display and badge
            <div className="flex items-center justify-center gap-x-2 mt-3 text-sm text-gray-600 dark:text-gray-400">
              <span>@{loggedInUser.username}</span>
              {loggedInUser.verificationBadge && <VerificationBadgeIcon />}
            </div>
          )}
        </div>

        <p className="text-sm text-secondary-darker">
          Joined {formatRelativeTime(JSON.stringify(new Date(loggedInUser.createdAt)))}
        </p>

        {/* Update (hidden when no changes) */}
        {hasUnsavedChanges && (
          <div className="flex flex-col items-center gap-2">
            {/* Reset Changes button (replaces top-right cross) */}
            <button
              onClick={() => {
                // revert local changes (same as original Cancel)
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
                setHasUnsavedChanges(false);
                setShowCropper(false);
              }}
              className="px-6 py-2 bg-blue-500 text-white rounded-md shadow"
            >
              Reset Changes
            </button>

            <button
              onClick={handleUpdateProfile}
              disabled={isLoading}
              className="px-6 py-2 bg-blue-500 hover:bg-blue-500-dark rounded text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Updating..." : "Update profile"}
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
            {/* Backdrop */}
            <motion.div
              onClick={() => setShowCropper(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal content */}
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
