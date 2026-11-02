/**
 * Prétraitement d'image pour le moteur OCR (canvas, contraste dynamique, redimensionnement)
 */

export const preprocessImageForOcr = (file: File): Promise<string | File> => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file);
          return;
        }

        let width = img.width;
        let height = img.height;
        const maxDim = 1800;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;

        let minLuma = 255;
        let maxLuma = 0;
        const lumaArray = new Uint8Array(data.length / 4);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const luma = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
          lumaArray[i / 4] = luma;
          if (luma < minLuma) minLuma = luma;
          if (luma > maxLuma) maxLuma = luma;
        }

        const range = maxLuma - minLuma || 1;

        for (let i = 0; i < data.length; i += 4) {
          const idx = i / 4;
          const origLuma = lumaArray[idx];
          // Gentle contrast stretch preserving anti-aliasing and font gradients
          let stretched = Math.round(((origLuma - minLuma) / range) * 255);
          if (stretched < 40) stretched = 0;
          else if (stretched > 220) stretched = 255;

          data[i] = stretched;
          data[i + 1] = stretched;
          data[i + 2] = stretched;
        }

        ctx.putImageData(imgData, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      };
      img.onerror = () => resolve(file);
      img.src = event.target?.result as string;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
