import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, Inbox, Loader2 } from 'lucide-react';
import api, { getErrorMessage } from '../api.js';
import Alert from '../components/Alert.jsx';
import Modal from '../components/Modal.jsx';
import { formatDateTime, formatTrn } from '../utils.js';

const STATUS_STYLES = {
  pending: 'bg-amber-50 text-amber-700',
  accepted: 'bg-emerald-50 text-emerald-700',
  declined: 'bg-red-50 text-red-700',
  completed: 'bg-slate-100 text-slate-600',
  cancelled: 'bg-slate-100 text-slate-500',
};
const URGENCY_STYLES = {
  routine: 'text-slate-500',
  urgent: 'font-semibold text-amber-700',
  emergency: 'font-semibold text-red-700',
};

export default function Referrals({ user }) {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flash, setFlash] = useState('');
  const [box, setBox] = useState('incoming'); // incoming | outgoing
  const [answering, setAnswering] = useState(null); // { referral, status } while the note dialog is open
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/api/referrals');
      setReferrals(data);
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to load referrals.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Send a status change (accept, decline, complete, cancel)
  const changeStatus = async (referral, status, responseNote = '') => {
    setSaving(true);
    setError('');
    try {
      const { data } = await api.patch(`/api/referrals/${referral.id}`, { status, response_note: responseNote });
      setFlash(data.message);
      setAnswering(null);
      setNote('');
      await load();
    } catch (err) {
      setError(getErrorMessage(err, 'Unable to update the referral.'));
      setAnswering(null);
    } finally {
      setSaving(false);
    }
  };

  const canRespond = ['doctor', 'admin'].includes(user.role);
  const visible = referrals.filter((r) => r.direction === box);
  const pendingIncoming = referrals.filter((r) => r.direction === 'incoming' && r.status === 'pending').length;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Referrals</h1>
        <p className="mt-1 text-sm text-slate-500">
          Accepting a referral gives your institution access to the patient's record. Start a new referral from a patient's page.
        </p>
      </div>

      {flash && <Alert type="success" onClose={() => setFlash('')}>{flash}</Alert>}
      {error && <Alert onClose={() => setError('')}>{error}</Alert>}

      <div className="flex gap-2">
        {[['incoming', 'Incoming', Inbox], ['outgoing', 'Sent', Send]].map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setBox(key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              box === key ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            <Icon size={16} /> {label}
            {key === 'incoming' && pendingIncoming > 0 && (
              <span className="rounded-full bg-amber-400 px-1.5 text-xs text-slate-900">{pendingIncoming}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      ) : visible.length === 0 ? (
        <div className="card px-5 py-14 text-center text-sm text-slate-500">
          {box === 'incoming' ? 'No referrals have been sent to your institution.' : 'You have not sent any referrals.'}
        </div>
      ) : (
        <ul className="space-y-4">
          {visible.map((r) => {
            // Link to the record only when this institution can actually open it
            const canOpen = r.direction === 'outgoing' || ['accepted', 'completed'].includes(r.status);
            return (
              <li key={r.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {canOpen ? <Link to={`/patients/${r.patient_id}`} className="hover:text-brand-700">{r.patient_name}</Link> : r.patient_name}
                      <span className="ml-2 text-sm font-normal text-slate-400">TRN {formatTrn(r.patient_trn)}</span>
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {r.direction === 'incoming' ? `From ${r.from_institution_name}` : `To ${r.to_institution_name}`}
                      {' · '}sent by {r.created_by_name} · {formatDateTime(r.created_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className={URGENCY_STYLES[r.urgency]}>{r.urgency[0].toUpperCase() + r.urgency.slice(1)}</span>
                    <span className={`rounded-full px-2.5 py-1 font-medium ${STATUS_STYLES[r.status]}`}>{r.status[0].toUpperCase() + r.status.slice(1)}</span>
                  </div>
                </div>

                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.reason}</p>
                {r.response_note && <p className="mt-2 text-sm italic text-slate-500">Reply: {r.response_note}</p>}

                {/* Actions available for this referral */}
                <div className="mt-4 flex flex-wrap gap-3">
                  {r.direction === 'incoming' && r.status === 'pending' && canRespond && (
                    <>
                      <button type="button" className="btn-primary !py-2" onClick={() => setAnswering({ referral: r, status: 'accepted' })}>Accept</button>
                      <button type="button" className="btn-danger" onClick={() => setAnswering({ referral: r, status: 'declined' })}>Decline</button>
                    </>
                  )}
                  {r.direction === 'incoming' && r.status === 'accepted' && canRespond && (
                    <button type="button" className="btn-secondary !py-2" onClick={() => changeStatus(r, 'completed')}>Mark completed</button>
                  )}
                  {r.direction === 'outgoing' && r.status === 'pending' && (
                    <button type="button" className="btn-danger" onClick={() => changeStatus(r, 'cancelled')}>Cancel referral</button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {answering && (
        <Modal
          title={`${answering.status === 'accepted' ? 'Accept' : 'Decline'} referral for ${answering.referral.patient_name}`}
          onClose={() => setAnswering(null)}
        >
          <div className="space-y-4">
            <div>
              <label htmlFor="resp_note" className="label">Note to the sending institution (optional)</label>
              <textarea id="resp_note" rows={3} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} className="input" />
            </div>
            {answering.status === 'accepted' && (
              <p className="text-xs text-slate-500">Your institution will be able to see this patient's record once you accept.</p>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={() => setAnswering(null)}>Cancel</button>
              <button type="button" disabled={saving} className="btn-primary" onClick={() => changeStatus(answering.referral, answering.status, note)}>
                {saving && <Loader2 size={16} className="animate-spin" />}
                {answering.status === 'accepted' ? 'Accept referral' : 'Decline referral'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
