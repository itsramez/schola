import { Construction } from "lucide-react";
import Modal from "./Modal";

export default function ComingSoonModal({
  open,
  onClose,
  title,
  message,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: string;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <div className="flex flex-col items-center text-center py-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue/10 text-blue mb-3">
          <Construction className="h-6 w-6" />
        </div>
        <p className="text-sm text-slate-500">{message}</p>
      </div>
    </Modal>
  );
}
