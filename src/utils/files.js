// Saving and printing files that came from the API (Blob + name).

/** Makes the browser save the file with its name. */
export const saveFile = ({ blob, filename }) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/**
 * Opens a PDF in a hidden frame and shows the print dialog. If the browser
 * cannot print it from there (some phones), it opens the PDF in a new tab.
 */
export const printPdf = ({ blob }) => {
  const url = URL.createObjectURL(blob);
  const frame = document.createElement('iframe');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.src = url;
  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch {
      window.open(url, '_blank');
    }
  };
  document.body.append(frame);
  setTimeout(() => {
    frame.remove();
    URL.revokeObjectURL(url);
  }, 120_000);
};
