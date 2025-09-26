// components/providers/post-modal-provider.js
"use client";

import { PostModal } from "@/components/modals/post-modal";
import { usePostModalStore } from "@/lib/store";
import { useRouter } from "next/navigation";

export function PostModalProvider({ children }) {
  const router = useRouter();
  const { isOpen, close } = usePostModalStore();

  const handleSuccess = () => {
    // Refresh the current page or redirect as needed
    router.refresh();
    // You can also add any other success logic here
  };

  return (
    <>
      {children}
      {isOpen && <PostModal onClose={close} onSuccess={handleSuccess} />}
    </>
  );
}
