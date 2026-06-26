import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import MatriculaRewardsInvitePopup from "../../components/MatriculaRewardsInvitePopup";

const ModalEmbaixadorPreview: React.FC = () => {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-700 flex flex-col items-center justify-center gap-6">
      <div className="text-white text-sm font-mono bg-black/30 px-4 py-2 rounded-lg">
        DEV PREVIEW — /dev/modal-embaixador
      </div>

      <button
        onClick={() => setOpen(true)}
        className="px-6 py-3 bg-white text-slate-800 font-semibold rounded-xl shadow hover:bg-slate-100 transition"
      >
        Abrir modal
      </button>

      <MatriculaRewardsInvitePopup
        isOpen={open}
        onClose={() => setOpen(false)}
        onAccept={() => {
          setOpen(false);
          navigate("/student/dashboard/rewards");
        }}
        variant="dashboard"
      />
    </div>
  );
};

export default ModalEmbaixadorPreview;
