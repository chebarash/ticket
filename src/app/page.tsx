"use client";
import styles from "./page.module.css";
import { useEffect, useRef, useState } from "react";

function grayscale(imgData: ImageData) {
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
    data[i] = brightness;
    data[i + 1] = brightness;
    data[i + 2] = brightness;
  }
  return imgData;
}

function boxblur(imgData: ImageData, width: number) {
  const data = imgData.data;

  const offsets = [
    -width * 4 - 4,
    -width * 4,
    -width * 4 + 4,
    -4,
    0,
    +4,
    width * 4 - 4,
    width * 4,
    width * 4 + 4,
  ];

  for (let i = 0; i < data.length; i += 4) {
    let totalR = 0,
      totalG = 0,
      totalB = 0;

    for (let j = 0; j < offsets.length; j++) {
      const neighborIndex = i + offsets[j];
      if (neighborIndex >= 0 && neighborIndex < data.length) {
        totalR += data[neighborIndex];
        totalG += data[neighborIndex + 1];
        totalB += data[neighborIndex + 2];
      }
    }

    data[i] = totalR / offsets.length;
    data[i + 1] = totalG / offsets.length;
    data[i + 2] = totalB / offsets.length;
    data[i + 3] = data[i + 3];
  }

  return imgData;
}

function enhanceContrast(imgData: ImageData, contrast: number) {
  const data = imgData.data;

  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));

  for (let i = 0; i < data.length; i += 4) {
    data[i] = truncateColor(factor * (data[i] - 128) + 128);
    data[i + 1] = truncateColor(factor * (data[i + 1] - 128) + 128);
    data[i + 2] = truncateColor(factor * (data[i + 2] - 128) + 128);
  }

  return imgData;
}

function truncateColor(value: number) {
  return Math.min(Math.max(value, 0), 255);
}

function edgeDetection(imgData: ImageData) {
  const width = imgData.width;
  const height = imgData.height;
  const edges = new ImageData(width, height);
  const gx = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1],
  ];
  const gy = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1],
  ];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sumX = 0;
      let sumY = 0;
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const pixel = getPixel(imgData, x + i, y + j);
          const gray = (pixel.r + pixel.g + pixel.b) / 3;
          sumX += gray * gx[i + 1][j + 1];
          sumY += gray * gy[i + 1][j + 1];
        }
      }
      const edgeValue = Math.sqrt(sumX * sumX + sumY * sumY);
      setPixel(edges, x, y, edgeValue, edgeValue, edgeValue, 255);
    }
  }

  return edges;
}

function getPixel(imgData: ImageData, x: number, y: number) {
  const position = (x + y * imgData.width) * 4;
  return {
    r: imgData.data[position + 0],
    g: imgData.data[position + 1],
    b: imgData.data[position + 2],
    a: imgData.data[position + 3],
  };
}

function setPixel(
  imgData: ImageData,
  x: number,
  y: number,
  r: number,
  g: number,
  b: number,
  a: number
) {
  const position = (x + y * imgData.width) * 4;
  imgData.data[position + 0] = r;
  imgData.data[position + 1] = g;
  imgData.data[position + 2] = b;
  imgData.data[position + 3] = a;
}

function binarize(imgData: ImageData) {
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const brightness = 0.34 * data[i] + 0.5 * data[i + 1] + 0.16 * data[i + 2];
    const threshold = 128;
    const binaryColor = brightness < threshold ? 0 : 255;

    data[i] = binaryColor;
    data[i + 1] = binaryColor;
    data[i + 2] = binaryColor;
  }

  return imgData;
}

export default function Home() {
  const [interval, setTimeout] = useState<NodeJS.Timeout>();
  const [img, setImg] = useState<string>(``);
  const video = useRef<HTMLVideoElement>(null);

  const shot = () => {
    if (!video.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.current.videoWidth;
    canvas.height = video.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video.current, 0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const grayscaleData = grayscale(imgData);

    const boxblurData = boxblur(grayscaleData, canvas.width);

    const contrast = 100;
    const enhanceContrastData = enhanceContrast(boxblurData, contrast);

    const edgeData = edgeDetection(enhanceContrastData);

    const binarized = binarize(edgeData);

    ctx.putImageData(binarized, 0, 0);

    setImg(canvas.toDataURL());
  };

  useEffect(() => {
    (async () => {
      if (video.current) {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: `environment` },
            audio: false,
          });
          video.current.srcObject = stream;
          clearInterval(interval);
          setTimeout(setInterval(shot, 500));
        }
      }
    })();
  }, [video]);

  return (
    <>
      <video
        className={styles.video}
        ref={video}
        autoPlay
        playsInline
        muted
      ></video>
      <img className={styles.img} src={img}></img>
    </>
  );
}
