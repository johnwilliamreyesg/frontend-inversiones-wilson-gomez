import { useRef, useState } from 'react';
import { Camera, ImageOff, RefreshCw, Trash2 } from 'lucide-react';
import { useClientPhotos, useDeletePhoto, useUploadPhoto } from './clients.queries.js';
import { useAuth } from '../../auth/AuthProvider.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Modal.jsx';
import { ErrorAlert, ErrorState } from '../../components/ui/Feedback.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

const POSITIONS = [1, 2, 3];
const MAX_FILE_BYTES = 15 * 1024 * 1024;
// Listing only these makes iPhones convert HEIC photos to JPEG before uploading.
const ACCEPTED_TYPES = 'image/jpeg,image/png,image/webp';

/** The client's 3 photo slots: take/choose a photo, view it large, replace or delete it. */
export function ClientPhotos({ clientId }) {
  const { can } = useAuth();
  const canEdit = can('clients.update');
  const { data: photos, error, refetch } = useClientPhotos(clientId);
  const upload = useUploadPhoto(clientId);
  const remove = useDeletePhoto(clientId);
  const fileInput = useRef(null);
  const [target, setTarget] = useState(null); // slot waiting for a file
  const [viewing, setViewing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [fileError, setFileError] = useState(null);

  const pickFile = (position) => {
    setTarget(position);
    setFileError(null);
    upload.reset();
    fileInput.current.click();
  };

  const onFileChosen = (event) => {
    const file = event.target.files?.[0];
    event.target.value = ''; // so choosing the same file again fires onChange
    if (!file || !target) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError('La foto pesa más de 15 MB. Tome una foto nueva o elija otra.');
      return;
    }
    upload.mutate({ position: target, file });
  };

  const bySlot = new Map((photos ?? []).map((photo) => [photo.position, photo]));

  return (
    <Card title="Fotos" collapsible actions={<span className="text-sm text-slate-500">{bySlot.size} de 3</span>}>
      {error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : (
        <>
          <input ref={fileInput} type="file" accept={ACCEPTED_TYPES} className="hidden" onChange={onFileChosen} />
          {fileError && <p className="mb-3 text-sm text-red-600">{fileError}</p>}
          <ErrorAlert error={upload.error} className="mb-3" />
          <div className="grid grid-cols-3 gap-3">
            {POSITIONS.map((position) => {
              const photo = bySlot.get(position);
              const busy = upload.isPending && upload.variables?.position === position;
              return (
                <div key={position} className="relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
                  {busy ? (
                    <div className="grid h-full place-items-center text-slate-500">
                      <Spinner />
                    </div>
                  ) : photo ? (
                    <button type="button" onClick={() => setViewing(photo)} className="block size-full" aria-label={`Ver foto ${position}`}>
                      <img src={photo.thumbnailUrl} alt={`Foto ${position} del cliente`} className="size-full object-cover" loading="lazy" onError={() => refetch()} />
                    </button>
                  ) : canEdit ? (
                    <button
                      type="button"
                      onClick={() => pickFile(position)}
                      disabled={upload.isPending}
                      className="flex size-full flex-col items-center justify-center gap-1 text-xs font-medium text-slate-500 hover:bg-slate-200/60"
                    >
                      <Camera className="size-6" aria-hidden="true" />
                      Agregar
                    </button>
                  ) : (
                    <div className="grid h-full place-items-center text-slate-300">
                      <ImageOff className="size-6" aria-hidden="true" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {canEdit && <p className="mt-3 text-xs text-slate-500">En el celular, "Agregar" permite tomar la foto con la cámara o elegirla de la galería.</p>}
        </>
      )}

      <Modal
        open={Boolean(viewing)}
        onClose={() => setViewing(null)}
        title={`Foto ${viewing?.position ?? ''}`}
        size="lg"
        footer={
          canEdit &&
          viewing && (
            <>
              <Button
                variant="danger"
                icon={Trash2}
                onClick={() => {
                  setDeleting(viewing.position);
                  setViewing(null);
                }}
              >
                Eliminar
              </Button>
              <Button
                variant="secondary"
                icon={RefreshCw}
                onClick={() => {
                  const { position } = viewing;
                  setViewing(null);
                  pickFile(position);
                }}
              >
                Reemplazar
              </Button>
            </>
          )
        }
      >
        {viewing && <img src={viewing.url} alt={`Foto ${viewing.position} del cliente`} className="mx-auto max-h-[70dvh] rounded-lg object-contain" />}
      </Modal>

      <ConfirmDialog
        open={deleting !== null}
        onClose={() => {
          setDeleting(null);
          remove.reset();
        }}
        onConfirm={() => remove.mutate(deleting, { onSuccess: () => setDeleting(null) })}
        title="Eliminar foto"
        confirmLabel="Eliminar foto"
        loading={remove.isPending}
        error={remove.error}
      >
        La foto {deleting} se borrará definitivamente.
      </ConfirmDialog>
    </Card>
  );
}
