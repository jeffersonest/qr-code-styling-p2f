import getMode from "../tools/getMode";
import mergeDeep from "../tools/merge";
import downloadURI from "../tools/downloadURI";
import QRCanvas from "./QRCanvas";
import defaultOptions, { Options, RequiredOptions } from "./QROptions";
import sanitizeOptions from "../tools/sanitizeOptions";
import { Extension, QRCode } from "../types";
import qrcode from "qrcode-generator";

type DownloadOptions = {
  name?: string;
  extension?: Extension;
};

export default class QRCodeStyling {
  _options: RequiredOptions;
  _container?: HTMLElement;
  _canvas?: QRCanvas;
  _qr?: QRCode;
  _drawingPromise?: Promise<void>;
  _dom: Document;

  constructor(dom: Document, options?: Partial<Options>) {
    this._options = options ? sanitizeOptions(mergeDeep(defaultOptions, options) as RequiredOptions) : defaultOptions;
    this._dom = dom;
    if (this._dom) {
      this._container = this._dom.createElement("div");
    }
    this.update();
  }

  static _clearContainer(container?: HTMLElement): void {
    if (container) {
      container.innerHTML = "";
    }
  }

  update(options?: Partial<Options>): void {
    QRCodeStyling._clearContainer(this._container);
    this._options = options ? sanitizeOptions(mergeDeep(this._options, options) as RequiredOptions) : this._options;

    if (!this._options.data) {
      return;
    }

    this._qr = qrcode(this._options.qrOptions.typeNumber, this._options.qrOptions.errorCorrectionLevel);
    this._qr.addData(this._options.data, this._options.qrOptions.mode || getMode(this._options.data));
    this._qr.make();
    this._canvas = new QRCanvas(this._dom, this._options);
    this._drawingPromise = this._canvas.drawQR(this._qr);
    this.append(this._container);
  }

  append(container?: HTMLElement): void {
    console.log(this._dom);

    if (!container) {
      return;
    }

    if (typeof container.appendChild !== "function") {
      throw "Container should be a single DOM node";
    }

    if (this._canvas) {
      container.appendChild(this._canvas.getCanvas());
    }

    this._container = container;
  }

  getBase64(downloadOptions?: Partial<DownloadOptions> | string): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this._drawingPromise) {
        reject(new Error("Drawing promise is not available."));
        return;
      }

      this._drawingPromise.then(() => {
        if (!this._canvas) {
          reject(new Error("Canvas is not initialized."));
          return;
        }

        let extension = "png";

        if (typeof downloadOptions === "string") {
          extension = downloadOptions;
          console.warn(
            "Extension is deprecated as argument for 'getBase64' method, please pass object { extension: '...' } as argument"
          );
        } else if (typeof downloadOptions === "object" && downloadOptions !== null && downloadOptions.extension) {
          extension = downloadOptions.extension;
        }

        const data = this._canvas.getCanvas().toDataURL(`image/${extension}`);
        resolve(data);
      });
    });
  }

  download(downloadOptions?: Partial<DownloadOptions> | string): void {
    if (!this._drawingPromise) return;

    this._drawingPromise.then(() => {
      if (!this._canvas) return;

      let extension = "png";
      let name = "qr";

      //TODO remove deprecated code in the v2
      if (typeof downloadOptions === "string") {
        extension = downloadOptions;
        console.warn(
          "Extension is deprecated as argument for 'download' method, please pass object { name: '...', extension: '...' } as argument"
        );
      } else if (typeof downloadOptions === "object" && downloadOptions !== null) {
        if (downloadOptions.name) {
          name = downloadOptions.name;
        }
        if (downloadOptions.extension) {
          extension = downloadOptions.extension;
        }
      }

      const data = this._canvas.getCanvas().toDataURL(`image/${extension}`);
      downloadURI(this._dom, data, `${name}.${extension}`);
    });
  }
}
