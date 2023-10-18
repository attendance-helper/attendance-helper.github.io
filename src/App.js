import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import cv from 'opencv.js';
// import pdfjsLib from 'pdf.js'
// import * as pdfjsLib from 'pdf-dist';
// import {pdfjsLib} from 'pdfjs-dist'
// import * as pdfjsLib from 'pdfjs-dist'

import { pdfjs } from 'react-pdf';

import names from './names.js'

function App() {
  const canvasRef = useRef(null);

  const [pdfFiles, setPdfFiles] = useState({ pdf1: null, pdf2: null, pdf3: null });

  const [textNames, setNames] = useState('');
  const [fileNames, setFileNames] = useState('');

  const [pdfImages, setPdfImages] = useState([])

  const [progText, setProgText] = useState('');
  const [progNumer, setProgNumer] = useState(0);
  const [progDenom, setProgDenom] = useState(0);

  const handleTextChange = (event) => {
    setNames(event.target.value);
  };

  const handleNameFileChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      const text = await file.text();
      setFileNames(text);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    // Use the 'textNames' and 'fileNames' variables for further processing.
    processNames();
  };

  const handleFileChange = (event, pdfNumber) => {
    const selectedFile = event.target.files[0];
    setPdfFiles((prevPdfFiles) => ({
      ...prevPdfFiles,
      [pdfNumber]: selectedFile,
    }));
  };
  
  async function loadPDFs() {
    console.log("Called load pdfs");

    // You can now handle these files, e.g., load and process them using PDF.js
    // or perform any other desired actions.

    if (pdfFiles.pdf1 && pdfFiles.pdf2 && pdfFiles.pdf3) {
    } else {
        alert('Please select all three PDF files.');
        return;
    }

    let pdfPaths = [
      URL.createObjectURL(pdfFiles.pdf1),
      URL.createObjectURL(pdfFiles.pdf2),
      URL.createObjectURL(pdfFiles.pdf3)
    ];

    var pdfImages = [];
    for (let pdfNum=0; pdfNum < pdfPaths.length; pdfNum++) {
      let pdfPath = pdfPaths[pdfNum];
      const pdf = await pdfjs.getDocument(pdfPath).promise;
      const numPages = pdf.numPages;
      const pdfPageImages = [];

      setProgText("Loading PDF #" + (pdfNum+1).toString() + " page ")
      setProgDenom(numPages);
  
      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        setProgNumer(pageNum);

        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 }); // Adjust scale as needed
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
  
        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };
  
        const renderTask = page.render(renderContext);
        await renderTask.promise;
  
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        // pdfPageImages.push(imageData);

        const mat = new cv.Mat(canvas.height, canvas.width, cv.CV_8UC4);
        mat.data.set(imageData.data);
        let res = processImage(mat);

        // if (pageNum == numPages) {
        //   console.log("Shwoing last page");
        //   cv.imshow("outputCanvas2", res);
        // }

        pdfPageImages.push(res);
      }
  
      pdfImages.push(pdfPageImages);
    }
    setProgDenom(0);
    setPdfImages(pdfImages);
    console.log(pdfImages);
  
    // Now, you have an array 'pdfImages' containing images of all pages from the three PDFs.
    // You can use these images with OpenCV.js.

    console.log("PDFs are loaded.")
  }

  function processNames() {
    console.log('Manually entered textNames:', textNames);
    console.log('Names from uploaded file:', fileNames);
    console.log(pdfImages)

    if (textNames === '' && fileNames === '') {
      alert("Please enter your students' textNames in the textbox below or by uploading a file.");
      return;
    }

    let n = '';
    if (textNames === '') {
      n = fileNames;
    }
    else {
      n = textNames;
    }

    console.log("TF");
    console.log(n);
    n = n.split('\n')
    console.log(n);

    let threshold = 30;
    let cr = 1;

    let finalim = [];
    for (var i = 0; i < pdfImages.length; i++) {
      console.log(pdfImages);
      console.log(pdfImages[i]);
      finalim.push(new cv.Mat(n.length*63, pdfImages[i][0].cols*4, cv.CV_8UC4));
    }

    for (var k = 0; k < n.length; k++) {
      var person = n[k];

      let name_regions = [];
      let i1_regions = [];
      let i2_regions = [];

      let i1_max = 0;
      let i1_ind = 0;
      let i2_max = 0;
      let i2_ind = 0;

      // find position of name in names
      let position = []
      for (var i = 0; i < names.length; i++) {
        for (var j = 0; j < names[i].length; j++) {
          if (names[i][j] === person) {
            position = [i, j] // page, row in page
            if (i === 0) {
              position = [i, j+1]
            }
          }
        }
      }
      console.log(position);
      if (position.length === 0) {
        alert("Could not find name in roster: " + person);
        continue;
      }

      console.log(person)
      console.log(pdfImages.length)
      for (var i = 0; i < pdfImages.length; i++) {
        let height = pdfImages[i][position[0]].rows;
        let width = pdfImages[i][position[0]].cols;

        let cellHeight = height / names[position[0]].length;
        if (position[0] === 0) {
          cellHeight = height / (names[position[0]].length+1);
        }

        let rect1 = new cv.Rect(0, cellHeight*position[1], width*(393-3)/(917), cellHeight);
        let rect2 = new cv.Rect(width*(393)/(917), cellHeight*position[1], width*(663 - 393)/(917), cellHeight);
        let rect3 = new cv.Rect(width*(663)/(917), cellHeight*position[1], width*(917 - 663)/(917), cellHeight);

        let name_region = pdfImages[i][position[0]].roi(rect1);
        let i1_region = pdfImages[i][position[0]].roi(rect2);
        let i2_region = pdfImages[i][position[0]].roi(rect3);

        name_regions.push(name_region)
        i1_regions.push(i1_region);
        i2_regions.push(i2_region);
      }

      // Create a region of interest (ROI)
      for (var i = 0; i < 1; i++) {
        let width = finalim[i].cols;

        console.log("DOING ROI")
        console.log(finalim[i].cols);
        console.log(finalim[i].rows);

        let roi1 = finalim[i].roi(new cv.Rect(0, k*60, name_regions[i].cols, name_regions[i].rows)); // Adjust the coordinates as needed
        name_regions[i].copyTo(roi1);

        let roi2 = finalim[i].roi(new cv.Rect(name_regions[i].cols, k*60, i1_regions[i].cols, i1_regions[i].rows)); // Adjust the coordinates as needed
        i1_regions[i].copyTo(roi2);
        let roi3 = finalim[i].roi(new cv.Rect(name_regions[i].cols+i1_regions[i].cols, k*60, i2_regions[i].cols, i2_regions[i].rows)); // Adjust the coordinates as needed
        i2_regions[i].copyTo(roi3);

        let roi4 = finalim[i].roi(new cv.Rect(name_regions[i].cols+i1_regions[i].cols+i2_regions[i].cols+25, k*60, i1_regions[1].cols, i1_regions[1].rows)); // Adjust the coordinates as needed
        i1_regions[1].copyTo(roi4);
        let roi5 = finalim[i].roi(new cv.Rect(name_regions[i].cols+i1_regions[i].cols+i2_regions[i].cols+25+i1_regions[1].cols, k*60, i2_regions[1].cols, i2_regions[1].rows)); // Adjust the coordinates as needed
        i2_regions[1].copyTo(roi5);

        let roi6 = finalim[i].roi(new cv.Rect(name_regions[i].cols+i1_regions[i].cols+i2_regions[i].cols+25+i1_regions[1].cols+i2_regions[1].cols+25, k*60, i1_regions[2].cols, i1_regions[2].rows)); // Adjust the coordinates as needed
        i1_regions[2].copyTo(roi6);
        let roi7 = finalim[i].roi(new cv.Rect(name_regions[i].cols+i1_regions[i].cols+i2_regions[i].cols+25+i1_regions[1].cols+i2_regions[1].cols+25+i1_regions[2].cols, k*60, i2_regions[2].cols, i2_regions[2].rows)); // Adjust the coordinates as needed
        i2_regions[2].copyTo(roi7);
      }
      // cv.cvtColor(name_regions[0], name_regions[0], cv.COLOR_RGBA2BGR);

      // Copy the source image to the ROI

    }
    for (var i = 1; i <= 1; i++) {
      cv.imshow('outputCanvas' + i.toString(), finalim[i-1]);
    }
  }

function processArray(arr) {
    var maxVal = -10000;
    var maxInd = -1;
    var minVal = 10000;
    var minInd = -1;

    for (var x = 0; x < arr.data32S.length; x += 2) {
        var xval = arr.data32S[x];
        if (xval < minVal) {
            minVal = xval;
            minInd = x;
        }
        if (xval > maxVal) {
            maxVal = xval;
            maxInd = x;
        }
    }

    return [minInd, maxInd]
}

function processImage(src) {
    // Convert the image to grayscale
    let gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);

    // Apply Gaussian blur
    let blurred = new cv.Mat();
    let ksize = new cv.Size(5, 5);
    cv.GaussianBlur(gray, blurred, ksize, 0, 0, cv.BORDER_DEFAULT);

    // Threshold the image
    let thresh = new cv.Mat();
    cv.adaptiveThreshold(blurred, thresh, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 11, 2);

    let dst = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC3);
    let lines = new cv.Mat();
    let color = new cv.Scalar(255, 0, 0);
    // You can try more different parameters
    cv.HoughLinesP(thresh, lines, 1, Math.PI / 180, 2, 10, 0);
    // draw lines
    for (let i = 0; i < lines.rows; ++i) {
        let startPoint = new cv.Point(lines.data32S[i * 4], lines.data32S[i * 4 + 1]);
        let endPoint = new cv.Point(lines.data32S[i * 4 + 2], lines.data32S[i * 4 + 3]);
        cv.line(dst, startPoint, endPoint, color);
    }


    // let deskewed = new cv.Mat();

    let hierarchy = new cv.Mat();

    // // Detect horizontal lines
    let horizontal_kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(25, 1));
    let detected_horizontal = new cv.Mat();
    cv.morphologyEx(thresh, detected_horizontal, cv.MORPH_OPEN, horizontal_kernel, new cv.Point(-1, -1), 2);

    let contours_horizontal = new cv.MatVector();
    cv.findContours(detected_horizontal, contours_horizontal, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // console.log("Horizontal contours")
    var minIndex = -1;
    var minValue = 10000;
    var maxIndex = -1;
    var maxValue = -10000;
    for (let i = 0; i < contours_horizontal.size(); ++i) {
        let c = contours_horizontal.get(i);
        // for (let j = 0; j < c.data32S.length; j++) {
        //     console.log(c.data32S[j])
        // }

        var yval = c.data32S[1];
        if (yval > 30) {
            if (yval < minValue) {
                minValue = yval;
                minIndex = i;
            }
            if (yval > maxValue) {
                maxValue = yval;
                maxIndex = i;
            }
        }
    }

    const [minBotInd, maxBotInd] = processArray(contours_horizontal.get(maxIndex))
    const [minTopInd, maxTopInd] = processArray(contours_horizontal.get(minIndex))

    let ctop = contours_horizontal.get(minIndex);
    let cbot = contours_horizontal.get(maxIndex);
    let l = [
        ctop.data32S[minTopInd], ctop.data32S[minTopInd+1],
        ctop.data32S[maxTopInd], ctop.data32S[maxTopInd+1],
        cbot.data32S[maxBotInd], cbot.data32S[maxBotInd+1],
        cbot.data32S[minBotInd], cbot.data32S[minBotInd+1]
    ]
    cv.drawContours(dst, contours_horizontal, -1, new cv.Scalar(0, 255, 0, 255), 3)

    // draw lines
    for (let i = 0; i < 4; ++i) {
        let startPoint = new cv.Point(l[i*2], l[i*2+1]);
        let endPoint = new cv.Point(l[i*2+2], l[i*2+3]);
        cv.line(dst, startPoint, endPoint, new cv.Scalar(0,0,255,255));
    }

    let destCoords = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, src.cols, 0, src.cols, src.rows, 0, src.rows]);
    let srcCoords = cv.matFromArray(4, 1, cv.CV_32FC2, l);

    let transformationMatrix = cv.getPerspectiveTransform(srcCoords, destCoords)

    let deskewed = new cv.Mat();
    cv.warpPerspective(src, deskewed, transformationMatrix, new cv.Size(src.cols, src.rows));

    dst.delete();
    gray.delete();
    blurred.delete();
    thresh.delete();

    return deskewed;
}

useEffect(() => {
    document.title = "Attendance Helper";
    pdfjs.GlobalWorkerOptions.workerSrc ="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.js";
});

let progElem = <p></p>
if (progDenom !== 0) {
  progElem = <p>{progText}{progNumer}/{progDenom}</p>
}

let toppart = <></>
let pdfpicker = <></>
let nameinput = <></>
if (pdfImages.length !== 0) {
  toppart = 
      <div>
        <h1>Combined sheet:</h1>
        <canvas ref={canvasRef} id="outputCanvas1"></canvas>
      </div>

  nameinput=
    <div>
          <h1>Input Names</h1>

          <form onSubmit={handleSubmit}>
            <textarea
              rows="10"
              cols="40"
              placeholder="Enter student names, one per line"
              value={textNames}
              onChange={handleTextChange}
            ></textarea>
            <br />
            <input
              type="file"
              accept=".txt"
              onChange={handleNameFileChange}
            />
            <br />
            <button type="submit">Submit</button>
          </form>
    </div>
} else {
  pdfpicker =
    <div>
        <h1>Upload attendance sheets:</h1>
        <div>
            <input
              type="file"
              accept=".pdf"
              onChange={(event) => handleFileChange(event, 'pdf1')}
            />
          </div>
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={(event) => handleFileChange(event, 'pdf2')}
            />
          </div>
          <div>
            <input
              type="file"
              accept=".pdf"
              onChange={(event) => handleFileChange(event, 'pdf3')}
            />
          </div>
          <div>
            <button onClick={loadPDFs}>Process PDFs</button>
          </div>
    </div>
}

return (
    <div className="mainContent">
        {toppart}
        {progElem}
        {pdfpicker}
        {nameinput}
    </div>
);
}

export default App;
