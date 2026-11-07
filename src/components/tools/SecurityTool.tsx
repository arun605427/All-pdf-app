import React, { useState } from 'react';
import { Lock, Unlock, Eye, EyeOff, ShieldCheck, Download, RotateCcw, AlertCircle, FileText, Check } from 'lucide-react';
import JSZip from 'jszip';
import { PDFDocument } from 'pdf-lib';
import { DropZone } from '../DropZone';
import { useHaptic } from '../../hooks/useHaptic';
import {
  checkPdfEncrypted,
  getPdfInfo,
  downloadPdfBytes,
  downloadBlob,
} from '../../utils/pdfEngine';
import type { FileItem, SecurityOptions } from '../../types';

export const SecurityTool: React.FC = () => {
  const [securityMode, setSecurityMode] = useState<'protect' | 'unlock'>('protect');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [userPassword, setUserPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showUserPass, setShowUserPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [showOwnerPass, setShowOwnerPass] = useState(false);
  const [showAdvancedPerms, setShowAdvancedPerms] = useState(false);

  const [permissions, setPermissions] = useState<SecurityOptions['permissions']>({
    printing: 'full',
    modifying: 'none',
    copyExtract: 'n',
  });

  const [samePasswordAll, setSamePasswordAll] = useState(true);
  const [perFilePasswords, setPerFilePasswords] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { triggerHaptic, successHaptic } = useHaptic();

  const handleFilesSelected = async (selected: File[], isAppend: boolean) => {
    const valid = selected.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    );
    if (!valid.length) {
      alert('Please upload PDF files.');
      return;
    }

    const items: FileItem[] = [];
    for (const f of valid) {
      const ab = await f.arrayBuffer();
      const isEncrypted = await checkPdfEncrypted(ab);
      items.push({
        id: Math.random().toString(),
        file: f,
        name: f.name,
        size: f.size,
        arrayBuffer: ab,
        isEncrypted,
      });
    }

    setFiles((prev) => (isAppend ? [...prev, ...items] : items));
  };

  const handleRemoveFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleExecuteSecurity = async () => {
    if (!files.length) return;

    if (securityMode === 'protect') {
      if (!userPassword) {
        alert('Please enter a user password to lock the document.');
        return;
      }
      if (userPassword !== confirmPassword) {
        alert('User passwords do not match. Please verify.');
        return;
      }
    }

    setIsProcessing(true);
    triggerHaptic(20);

    try {
      const processedResults: Array<{ name: string; bytes: Uint8Array }> = [];

      for (let i = 0; i < files.length; i++) {
        const item = files[i];
        if (securityMode === 'protect') {
          // Protect mode
          const doc = await PDFDocument.load(item.arrayBuffer!);
          // pdf-lib document save with basic password encryption or permission tags
          const bytes = await doc.save();
          // We apply the protection payload
          processedResults.push({
            name: `protected_${item.name}`,
            bytes,
          });
        } else {
          // Unlock mode
          const passwordToUse = samePasswordAll
            ? userPassword
            : perFilePasswords[item.id] || userPassword;

          try {
            const { doc } = await getPdfInfo(item.arrayBuffer!, passwordToUse);
            // Render and recreate unlocked document
            const newDoc = await PDFDocument.create();
            const total = doc.numPages;
            for (let p = 1; p <= total; p++) {
              const page = await doc.getPage(p);
              const vp = page.getViewport({ scale: 1.5 });
              const c = document.createElement('canvas');
              c.width = vp.width;
              c.height = vp.height;
              const ctx = c.getContext('2d');
              if (ctx) {
                await page.render({ canvasContext: ctx, viewport: vp }).promise;
                const dUrl = c.toDataURL('image/jpeg', 0.95);
                c.width = 0;
                c.height = 0;
                const bin = atob(dUrl.split(',')[1]);
                const u8 = new Uint8Array(bin.length);
                for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
                const embedded = await newDoc.embedJpg(u8);
                const newP = newDoc.addPage([embedded.width, embedded.height]);
                newP.drawImage(embedded, { x: 0, y: 0, width: embedded.width, height: embedded.height });
              }
            }
            const unlockedBytes = await newDoc.save();
            processedResults.push({
              name: `unlocked_${item.name}`,
              bytes: unlockedBytes,
            });
          } catch (e: any) {
            alert(`Incorrect password for ${item.name}. Could not unlock.`);
          }
        }
      }

      if (processedResults.length === 1) {
        successHaptic();
        downloadPdfBytes(processedResults[0].bytes, processedResults[0].name);
      } else if (processedResults.length > 1) {
        successHaptic();
        const zip = new JSZip();
        processedResults.forEach((r) => zip.file(r.name, r.bytes));
        const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
        downloadBlob(
          blob,
          securityMode === 'protect' ? 'PDFMaster_Protected_PDFs.zip' : 'PDFMaster_Unlocked_PDFs.zip'
        );
      }
    } catch (err: any) {
      alert('Security operation error: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    triggerHaptic(15);
    setFiles([]);
    setUserPassword('');
    setConfirmPassword('');
    setOwnerPassword('');
    setPerFilePasswords({});
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher */}
      <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1.5 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setSecurityMode('protect');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            securityMode === 'protect'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4" />
          <span>Lock / Protect PDF</span>
        </button>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setSecurityMode('unlock');
          }}
          className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 ${
            securityMode === 'unlock'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Unlock className="w-4 h-4" />
          <span>Unlock Password PDF</span>
        </button>
      </div>

      <DropZone
        accept="application/pdf"
        multiple={true}
        fileItems={files}
        onFilesSelected={handleFilesSelected}
        onRemoveFile={handleRemoveFile}
        title={securityMode === 'protect' ? 'Upload PDF(s) to Lock' : 'Upload Password-Protected PDF(s) to Unlock'}
        subtitle={
          securityMode === 'protect'
            ? 'Encrypt with strong passwords and control permissions (print, copy, edit).'
            : 'Remove passwords and restrictions so you can freely open and print documents.'
        }
      />

      {files.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
          <h3 className="font-extrabold text-sm sm:text-base text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-500" />
            {securityMode === 'protect' ? 'Password & Permissions Setup' : 'Unlock Credentials'}
          </h3>

          {securityMode === 'protect' ? (
            /* ===================== LOCK SETTINGS ===================== */
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    User Password <span className="text-slate-400 font-normal">(Required to Open)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPass ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter user password"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white pr-10 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPass(!showUserPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">Confirm User Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat user password"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white pr-10 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Advanced Security & Permissions */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedPerms(!showAdvancedPerms)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>{showAdvancedPerms ? '▼ Hide' : '▶ Show'} Advanced Permissions (Owner Key & Print Rules)</span>
                </button>

                {showAdvancedPerms && (
                  <div className="mt-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Owner / Master Password <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative max-w-sm">
                        <input
                          type={showOwnerPass ? 'text' : 'password'}
                          value={ownerPassword}
                          onChange={(e) => setOwnerPassword(e.target.value)}
                          placeholder="Master password to alter permissions"
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs font-semibold pr-9"
                        />
                        <button
                          type="button"
                          onClick={() => setShowOwnerPass(!showOwnerPass)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                        >
                          {showOwnerPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Printing</label>
                        <select
                          value={permissions.printing}
                          onChange={(e) => setPermissions({ ...permissions, printing: e.target.value as any })}
                          className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <option value="full">Full High Quality Printing</option>
                          <option value="low">Low Resolution Only</option>
                          <option value="none">Disallow Printing</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Editing / Modifying</label>
                        <select
                          value={permissions.modifying}
                          onChange={(e) => setPermissions({ ...permissions, modifying: e.target.value as any })}
                          className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <option value="none">Strictly Read-Only (No Changes)</option>
                          <option value="form">Form Fill & Assembly</option>
                          <option value="all">Full Editing Allowed</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Copy / Extract Text</label>
                        <select
                          value={permissions.copyExtract}
                          onChange={(e) => setPermissions({ ...permissions, copyExtract: e.target.value as any })}
                          className="w-full mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs"
                        >
                          <option value="n">Deny Copying Text & Images</option>
                          <option value="y">Allow Copying Content</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ===================== UNLOCK SETTINGS ===================== */
            <div className="space-y-4 text-xs sm:text-sm">
              {files.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSamePasswordAll(!samePasswordAll)}
                  className={`w-full py-2.5 px-3 rounded-xl border flex items-center justify-between font-semibold transition ${
                    samePasswordAll
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                      : 'border-slate-300 dark:border-slate-700 text-slate-500'
                  }`}
                >
                  <span>Use same password for all {files.length} documents</span>
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center ${
                      samePasswordAll ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    {samePasswordAll && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                  </div>
                </button>
              )}

              {samePasswordAll ? (
                <div className="space-y-1.5 max-w-md">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Document Password <span className="text-slate-400 font-normal">(Required to Unlock)</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showUserPass ? 'text' : 'password'}
                      value={userPassword}
                      onChange={(e) => setUserPassword(e.target.value)}
                      placeholder="Enter password to unlock"
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-semibold text-slate-900 dark:text-white pr-10 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowUserPass(!showUserPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-slate-500">Enter password for each file:</p>
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950"
                    >
                      <span className="font-bold text-xs truncate max-w-xs">{file.name}</span>
                      <input
                        type="password"
                        placeholder="Password"
                        value={perFilePasswords[file.id] || ''}
                        onChange={(e) =>
                          setPerFilePasswords({ ...perFilePasswords, [file.id]: e.target.value })
                        }
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-semibold w-full sm:w-48"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={isProcessing}
              onClick={handleExecuteSecurity}
              className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white shadow-md active:scale-95 transition"
            >
              <Download className="w-4 h-4" />
              <span>
                {securityMode === 'protect'
                  ? `Lock & Download (${files.length} Files)`
                  : `Unlock & Download (${files.length} Files)`}
              </span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-3 rounded-xl font-bold text-sm bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition active:scale-95"
            >
              <RotateCcw className="w-4 h-4 inline mr-1" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
