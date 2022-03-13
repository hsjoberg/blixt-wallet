import { BackendModule, InitOptions, MultiReadCallback, ReadCallback, Services } from "i18next";


type LoadPathOption =
  | string
  | ((lngs: string[], namespaces: string[]) => string)
  | ((lngs: string[], namespaces: string[]) => Promise<string>);

type AddPathOption =
  | string
  | ((lng: string, namespace: string) => string)

interface BackendOptions {
  /**
   * path where resources get loaded from, or a function
   * returning a path:
   * function(lngs, namespaces) { return customPath; }
   * the returned path will interpolate lng, ns if provided like giving a static path
   */
  loadPath?: LoadPathOption;
  /**
   * path to post missing resources, must be `string` or a `function` returning a path:
   * function(lng, namespace) { return customPath; }
   */
  addPath?: AddPathOption;
  /**
   * your backend server supports multiLoading
   * locales/resources.json?lng=de+en&ns=ns1+ns2
   * set loadPath: '/locales/resources.json?lng={{lng}}&ns={{ns}}' to adapt to multiLoading
   */
  allowMultiLoading?: boolean;
  /**
   * parse data after it has been fetched
   * in example use https://www.npmjs.com/package/json5
   * here it removes the letter a from the json (bad idea)
   */
  parse?(
    data: string,
    languages?: string | string[],
    namespaces?: string | string[]
  ): { [key: string]: any };
  /**
   * parse data before it has been sent by addPath
   */
  parsePayload?(
    namespace: string,
    key: string,
    fallbackValue?: string
  ): { [key: string]: any };
}

export default class NativeBackend implements BackendModule<BackendOptions>{
    constructor(services?: any, options?: BackendOptions){
        
    }
    init(services: Services, backendOptions: BackendOptions, i18nextOptions: InitOptions): void {
        throw new Error("Method not implemented.");
    }
    read(language: string, namespace: string, callback: ReadCallback): void {
        throw new Error("Method not implemented.");
    }
    type!: "backend";

}