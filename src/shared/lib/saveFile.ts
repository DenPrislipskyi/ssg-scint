/**
 * Hand a file to the browser to save, under the given name.
 *
 * The object URL is released on the next tick rather than at once: revoked
 * synchronously, some browsers cancel the download they have just started.
 */
export const saveFile = (blob: Blob, name: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
