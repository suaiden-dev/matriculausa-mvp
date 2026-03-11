(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // project/node_modules/@supabase/node-fetch/browser.js
  var browser_exports = {};
  __export(browser_exports, {
    Headers: () => Headers2,
    Request: () => Request2,
    Response: () => Response2,
    default: () => browser_default,
    fetch: () => fetch2
  });
  var getGlobal, globalObject, fetch2, browser_default, Headers2, Request2, Response2;
  var init_browser = __esm({
    "project/node_modules/@supabase/node-fetch/browser.js"() {
      "use strict";
      getGlobal = function() {
        if (typeof self !== "undefined") {
          return self;
        }
        if (typeof window !== "undefined") {
          return window;
        }
        if (typeof global !== "undefined") {
          return global;
        }
        throw new Error("unable to locate global object");
      };
      globalObject = getGlobal();
      fetch2 = globalObject.fetch;
      browser_default = globalObject.fetch.bind(globalObject);
      Headers2 = globalObject.Headers;
      Request2 = globalObject.Request;
      Response2 = globalObject.Response;
    }
  });

  // project/node_modules/@supabase/functions-js/dist/module/helper.js
  var resolveFetch;
  var init_helper = __esm({
    "project/node_modules/@supabase/functions-js/dist/module/helper.js"() {
      resolveFetch = (customFetch) => {
        let _fetch;
        if (customFetch) {
          _fetch = customFetch;
        } else if (typeof fetch === "undefined") {
          _fetch = (...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args));
        } else {
          _fetch = fetch;
        }
        return (...args) => _fetch(...args);
      };
    }
  });

  // project/node_modules/@supabase/functions-js/dist/module/types.js
  var FunctionsError, FunctionsFetchError, FunctionsRelayError, FunctionsHttpError, FunctionRegion;
  var init_types = __esm({
    "project/node_modules/@supabase/functions-js/dist/module/types.js"() {
      FunctionsError = class extends Error {
        constructor(message, name = "FunctionsError", context) {
          super(message);
          this.name = name;
          this.context = context;
        }
      };
      FunctionsFetchError = class extends FunctionsError {
        constructor(context) {
          super("Failed to send a request to the Edge Function", "FunctionsFetchError", context);
        }
      };
      FunctionsRelayError = class extends FunctionsError {
        constructor(context) {
          super("Relay Error invoking the Edge Function", "FunctionsRelayError", context);
        }
      };
      FunctionsHttpError = class extends FunctionsError {
        constructor(context) {
          super("Edge Function returned a non-2xx status code", "FunctionsHttpError", context);
        }
      };
      (function(FunctionRegion2) {
        FunctionRegion2["Any"] = "any";
        FunctionRegion2["ApNortheast1"] = "ap-northeast-1";
        FunctionRegion2["ApNortheast2"] = "ap-northeast-2";
        FunctionRegion2["ApSouth1"] = "ap-south-1";
        FunctionRegion2["ApSoutheast1"] = "ap-southeast-1";
        FunctionRegion2["ApSoutheast2"] = "ap-southeast-2";
        FunctionRegion2["CaCentral1"] = "ca-central-1";
        FunctionRegion2["EuCentral1"] = "eu-central-1";
        FunctionRegion2["EuWest1"] = "eu-west-1";
        FunctionRegion2["EuWest2"] = "eu-west-2";
        FunctionRegion2["EuWest3"] = "eu-west-3";
        FunctionRegion2["SaEast1"] = "sa-east-1";
        FunctionRegion2["UsEast1"] = "us-east-1";
        FunctionRegion2["UsWest1"] = "us-west-1";
        FunctionRegion2["UsWest2"] = "us-west-2";
      })(FunctionRegion || (FunctionRegion = {}));
    }
  });

  // project/node_modules/@supabase/functions-js/dist/module/FunctionsClient.js
  var __awaiter, FunctionsClient;
  var init_FunctionsClient = __esm({
    "project/node_modules/@supabase/functions-js/dist/module/FunctionsClient.js"() {
      init_helper();
      init_types();
      __awaiter = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      FunctionsClient = class {
        constructor(url, { headers = {}, customFetch, region = FunctionRegion.Any } = {}) {
          this.url = url;
          this.headers = headers;
          this.region = region;
          this.fetch = resolveFetch(customFetch);
        }
        /**
         * Updates the authorization header
         * @param token - the new jwt token sent in the authorisation header
         */
        setAuth(token) {
          this.headers.Authorization = `Bearer ${token}`;
        }
        /**
         * Invokes a function
         * @param functionName - The name of the Function to invoke.
         * @param options - Options for invoking the Function.
         */
        invoke(functionName, options = {}) {
          var _a;
          return __awaiter(this, void 0, void 0, function* () {
            try {
              const { headers, method, body: functionArgs } = options;
              let _headers = {};
              let { region } = options;
              if (!region) {
                region = this.region;
              }
              if (region && region !== "any") {
                _headers["x-region"] = region;
              }
              let body;
              if (functionArgs && (headers && !Object.prototype.hasOwnProperty.call(headers, "Content-Type") || !headers)) {
                if (typeof Blob !== "undefined" && functionArgs instanceof Blob || functionArgs instanceof ArrayBuffer) {
                  _headers["Content-Type"] = "application/octet-stream";
                  body = functionArgs;
                } else if (typeof functionArgs === "string") {
                  _headers["Content-Type"] = "text/plain";
                  body = functionArgs;
                } else if (typeof FormData !== "undefined" && functionArgs instanceof FormData) {
                  body = functionArgs;
                } else {
                  _headers["Content-Type"] = "application/json";
                  body = JSON.stringify(functionArgs);
                }
              }
              const response = yield this.fetch(`${this.url}/${functionName}`, {
                method: method || "POST",
                // headers priority is (high to low):
                // 1. invoke-level headers
                // 2. client-level headers
                // 3. default Content-Type header
                headers: Object.assign(Object.assign(Object.assign({}, _headers), this.headers), headers),
                body
              }).catch((fetchError) => {
                throw new FunctionsFetchError(fetchError);
              });
              const isRelayError = response.headers.get("x-relay-error");
              if (isRelayError && isRelayError === "true") {
                throw new FunctionsRelayError(response);
              }
              if (!response.ok) {
                throw new FunctionsHttpError(response);
              }
              let responseType = ((_a = response.headers.get("Content-Type")) !== null && _a !== void 0 ? _a : "text/plain").split(";")[0].trim();
              let data;
              if (responseType === "application/json") {
                data = yield response.json();
              } else if (responseType === "application/octet-stream") {
                data = yield response.blob();
              } else if (responseType === "text/event-stream") {
                data = response;
              } else if (responseType === "multipart/form-data") {
                data = yield response.formData();
              } else {
                data = yield response.text();
              }
              return { data, error: null };
            } catch (error) {
              return { data: null, error };
            }
          });
        }
      };
    }
  });

  // project/node_modules/@supabase/functions-js/dist/module/index.js
  var init_module = __esm({
    "project/node_modules/@supabase/functions-js/dist/module/index.js"() {
      init_FunctionsClient();
      init_types();
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js
  var require_PostgrestError = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestError.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      var PostgrestError2 = class extends Error {
        constructor(context) {
          super(context.message);
          this.name = "PostgrestError";
          this.details = context.details;
          this.hint = context.hint;
          this.code = context.code;
        }
      };
      exports.default = PostgrestError2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js
  var require_PostgrestBuilder = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestBuilder.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var node_fetch_1 = __importDefault((init_browser(), __toCommonJS(browser_exports)));
      var PostgrestError_1 = __importDefault(require_PostgrestError());
      var PostgrestBuilder2 = class {
        constructor(builder) {
          this.shouldThrowOnError = false;
          this.method = builder.method;
          this.url = builder.url;
          this.headers = builder.headers;
          this.schema = builder.schema;
          this.body = builder.body;
          this.shouldThrowOnError = builder.shouldThrowOnError;
          this.signal = builder.signal;
          this.isMaybeSingle = builder.isMaybeSingle;
          if (builder.fetch) {
            this.fetch = builder.fetch;
          } else if (typeof fetch === "undefined") {
            this.fetch = node_fetch_1.default;
          } else {
            this.fetch = fetch;
          }
        }
        /**
         * If there's an error with the query, throwOnError will reject the promise by
         * throwing the error instead of returning it as part of a successful response.
         *
         * {@link https://github.com/supabase/supabase-js/issues/92}
         */
        throwOnError() {
          this.shouldThrowOnError = true;
          return this;
        }
        /**
         * Set an HTTP header for the request.
         */
        setHeader(name, value) {
          this.headers = Object.assign({}, this.headers);
          this.headers[name] = value;
          return this;
        }
        then(onfulfilled, onrejected) {
          if (this.schema === void 0) {
          } else if (["GET", "HEAD"].includes(this.method)) {
            this.headers["Accept-Profile"] = this.schema;
          } else {
            this.headers["Content-Profile"] = this.schema;
          }
          if (this.method !== "GET" && this.method !== "HEAD") {
            this.headers["Content-Type"] = "application/json";
          }
          const _fetch = this.fetch;
          let res = _fetch(this.url.toString(), {
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(this.body),
            signal: this.signal
          }).then(async (res2) => {
            var _a, _b, _c;
            let error = null;
            let data = null;
            let count = null;
            let status = res2.status;
            let statusText = res2.statusText;
            if (res2.ok) {
              if (this.method !== "HEAD") {
                const body = await res2.text();
                if (body === "") {
                } else if (this.headers["Accept"] === "text/csv") {
                  data = body;
                } else if (this.headers["Accept"] && this.headers["Accept"].includes("application/vnd.pgrst.plan+text")) {
                  data = body;
                } else {
                  data = JSON.parse(body);
                }
              }
              const countHeader = (_a = this.headers["Prefer"]) === null || _a === void 0 ? void 0 : _a.match(/count=(exact|planned|estimated)/);
              const contentRange = (_b = res2.headers.get("content-range")) === null || _b === void 0 ? void 0 : _b.split("/");
              if (countHeader && contentRange && contentRange.length > 1) {
                count = parseInt(contentRange[1]);
              }
              if (this.isMaybeSingle && this.method === "GET" && Array.isArray(data)) {
                if (data.length > 1) {
                  error = {
                    // https://github.com/PostgREST/postgrest/blob/a867d79c42419af16c18c3fb019eba8df992626f/src/PostgREST/Error.hs#L553
                    code: "PGRST116",
                    details: `Results contain ${data.length} rows, application/vnd.pgrst.object+json requires 1 row`,
                    hint: null,
                    message: "JSON object requested, multiple (or no) rows returned"
                  };
                  data = null;
                  count = null;
                  status = 406;
                  statusText = "Not Acceptable";
                } else if (data.length === 1) {
                  data = data[0];
                } else {
                  data = null;
                }
              }
            } else {
              const body = await res2.text();
              try {
                error = JSON.parse(body);
                if (Array.isArray(error) && res2.status === 404) {
                  data = [];
                  error = null;
                  status = 200;
                  statusText = "OK";
                }
              } catch (_d) {
                if (res2.status === 404 && body === "") {
                  status = 204;
                  statusText = "No Content";
                } else {
                  error = {
                    message: body
                  };
                }
              }
              if (error && this.isMaybeSingle && ((_c = error === null || error === void 0 ? void 0 : error.details) === null || _c === void 0 ? void 0 : _c.includes("0 rows"))) {
                error = null;
                status = 200;
                statusText = "OK";
              }
              if (error && this.shouldThrowOnError) {
                throw new PostgrestError_1.default(error);
              }
            }
            const postgrestResponse = {
              error,
              data,
              count,
              status,
              statusText
            };
            return postgrestResponse;
          });
          if (!this.shouldThrowOnError) {
            res = res.catch((fetchError) => {
              var _a, _b, _c;
              return {
                error: {
                  message: `${(_a = fetchError === null || fetchError === void 0 ? void 0 : fetchError.name) !== null && _a !== void 0 ? _a : "FetchError"}: ${fetchError === null || fetchError === void 0 ? void 0 : fetchError.message}`,
                  details: `${(_b = fetchError === null || fetchError === void 0 ? void 0 : fetchError.stack) !== null && _b !== void 0 ? _b : ""}`,
                  hint: "",
                  code: `${(_c = fetchError === null || fetchError === void 0 ? void 0 : fetchError.code) !== null && _c !== void 0 ? _c : ""}`
                },
                data: null,
                count: null,
                status: 0,
                statusText: ""
              };
            });
          }
          return res.then(onfulfilled, onrejected);
        }
        /**
         * Override the type of the returned `data`.
         *
         * @typeParam NewResult - The new result type to override with
         * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
         */
        returns() {
          return this;
        }
        /**
         * Override the type of the returned `data` field in the response.
         *
         * @typeParam NewResult - The new type to cast the response data to
         * @typeParam Options - Optional type configuration (defaults to { merge: true })
         * @typeParam Options.merge - When true, merges the new type with existing return type. When false, replaces the existing types entirely (defaults to true)
         * @example
         * ```typescript
         * // Merge with existing types (default behavior)
         * const query = supabase
         *   .from('users')
         *   .select()
         *   .overrideTypes<{ custom_field: string }>()
         *
         * // Replace existing types completely
         * const replaceQuery = supabase
         *   .from('users')
         *   .select()
         *   .overrideTypes<{ id: number; name: string }, { merge: false }>()
         * ```
         * @returns A PostgrestBuilder instance with the new type
         */
        overrideTypes() {
          return this;
        }
      };
      exports.default = PostgrestBuilder2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js
  var require_PostgrestTransformBuilder = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
      var PostgrestTransformBuilder2 = class extends PostgrestBuilder_1.default {
        /**
         * Perform a SELECT on the query result.
         *
         * By default, `.insert()`, `.update()`, `.upsert()`, and `.delete()` do not
         * return modified rows. By calling this method, modified rows are returned in
         * `data`.
         *
         * @param columns - The columns to retrieve, separated by commas
         */
        select(columns) {
          let quoted = false;
          const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
            if (/\s/.test(c) && !quoted) {
              return "";
            }
            if (c === '"') {
              quoted = !quoted;
            }
            return c;
          }).join("");
          this.url.searchParams.set("select", cleanedColumns);
          if (this.headers["Prefer"]) {
            this.headers["Prefer"] += ",";
          }
          this.headers["Prefer"] += "return=representation";
          return this;
        }
        /**
         * Order the query result by `column`.
         *
         * You can call this method multiple times to order by multiple columns.
         *
         * You can order referenced tables, but it only affects the ordering of the
         * parent table if you use `!inner` in the query.
         *
         * @param column - The column to order by
         * @param options - Named parameters
         * @param options.ascending - If `true`, the result will be in ascending order
         * @param options.nullsFirst - If `true`, `null`s appear first. If `false`,
         * `null`s appear last.
         * @param options.referencedTable - Set this to order a referenced table by
         * its columns
         * @param options.foreignTable - Deprecated, use `options.referencedTable`
         * instead
         */
        order(column, { ascending = true, nullsFirst, foreignTable, referencedTable = foreignTable } = {}) {
          const key = referencedTable ? `${referencedTable}.order` : "order";
          const existingOrder = this.url.searchParams.get(key);
          this.url.searchParams.set(key, `${existingOrder ? `${existingOrder},` : ""}${column}.${ascending ? "asc" : "desc"}${nullsFirst === void 0 ? "" : nullsFirst ? ".nullsfirst" : ".nullslast"}`);
          return this;
        }
        /**
         * Limit the query result by `count`.
         *
         * @param count - The maximum number of rows to return
         * @param options - Named parameters
         * @param options.referencedTable - Set this to limit rows of referenced
         * tables instead of the parent table
         * @param options.foreignTable - Deprecated, use `options.referencedTable`
         * instead
         */
        limit(count, { foreignTable, referencedTable = foreignTable } = {}) {
          const key = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
          this.url.searchParams.set(key, `${count}`);
          return this;
        }
        /**
         * Limit the query result by starting at an offset `from` and ending at the offset `to`.
         * Only records within this range are returned.
         * This respects the query order and if there is no order clause the range could behave unexpectedly.
         * The `from` and `to` values are 0-based and inclusive: `range(1, 3)` will include the second, third
         * and fourth rows of the query.
         *
         * @param from - The starting index from which to limit the result
         * @param to - The last index to which to limit the result
         * @param options - Named parameters
         * @param options.referencedTable - Set this to limit rows of referenced
         * tables instead of the parent table
         * @param options.foreignTable - Deprecated, use `options.referencedTable`
         * instead
         */
        range(from, to, { foreignTable, referencedTable = foreignTable } = {}) {
          const keyOffset = typeof referencedTable === "undefined" ? "offset" : `${referencedTable}.offset`;
          const keyLimit = typeof referencedTable === "undefined" ? "limit" : `${referencedTable}.limit`;
          this.url.searchParams.set(keyOffset, `${from}`);
          this.url.searchParams.set(keyLimit, `${to - from + 1}`);
          return this;
        }
        /**
         * Set the AbortSignal for the fetch request.
         *
         * @param signal - The AbortSignal to use for the fetch request
         */
        abortSignal(signal) {
          this.signal = signal;
          return this;
        }
        /**
         * Return `data` as a single object instead of an array of objects.
         *
         * Query result must be one row (e.g. using `.limit(1)`), otherwise this
         * returns an error.
         */
        single() {
          this.headers["Accept"] = "application/vnd.pgrst.object+json";
          return this;
        }
        /**
         * Return `data` as a single object instead of an array of objects.
         *
         * Query result must be zero or one row (e.g. using `.limit(1)`), otherwise
         * this returns an error.
         */
        maybeSingle() {
          if (this.method === "GET") {
            this.headers["Accept"] = "application/json";
          } else {
            this.headers["Accept"] = "application/vnd.pgrst.object+json";
          }
          this.isMaybeSingle = true;
          return this;
        }
        /**
         * Return `data` as a string in CSV format.
         */
        csv() {
          this.headers["Accept"] = "text/csv";
          return this;
        }
        /**
         * Return `data` as an object in [GeoJSON](https://geojson.org) format.
         */
        geojson() {
          this.headers["Accept"] = "application/geo+json";
          return this;
        }
        /**
         * Return `data` as the EXPLAIN plan for the query.
         *
         * You need to enable the
         * [db_plan_enabled](https://supabase.com/docs/guides/database/debugging-performance#enabling-explain)
         * setting before using this method.
         *
         * @param options - Named parameters
         *
         * @param options.analyze - If `true`, the query will be executed and the
         * actual run time will be returned
         *
         * @param options.verbose - If `true`, the query identifier will be returned
         * and `data` will include the output columns of the query
         *
         * @param options.settings - If `true`, include information on configuration
         * parameters that affect query planning
         *
         * @param options.buffers - If `true`, include information on buffer usage
         *
         * @param options.wal - If `true`, include information on WAL record generation
         *
         * @param options.format - The format of the output, can be `"text"` (default)
         * or `"json"`
         */
        explain({ analyze = false, verbose = false, settings = false, buffers = false, wal = false, format = "text" } = {}) {
          var _a;
          const options = [
            analyze ? "analyze" : null,
            verbose ? "verbose" : null,
            settings ? "settings" : null,
            buffers ? "buffers" : null,
            wal ? "wal" : null
          ].filter(Boolean).join("|");
          const forMediatype = (_a = this.headers["Accept"]) !== null && _a !== void 0 ? _a : "application/json";
          this.headers["Accept"] = `application/vnd.pgrst.plan+${format}; for="${forMediatype}"; options=${options};`;
          if (format === "json")
            return this;
          else
            return this;
        }
        /**
         * Rollback the query.
         *
         * `data` will still be returned, but the query is not committed.
         */
        rollback() {
          var _a;
          if (((_a = this.headers["Prefer"]) !== null && _a !== void 0 ? _a : "").trim().length > 0) {
            this.headers["Prefer"] += ",tx=rollback";
          } else {
            this.headers["Prefer"] = "tx=rollback";
          }
          return this;
        }
        /**
         * Override the type of the returned `data`.
         *
         * @typeParam NewResult - The new result type to override with
         * @deprecated Use overrideTypes<yourType, { merge: false }>() method at the end of your call chain instead
         */
        returns() {
          return this;
        }
      };
      exports.default = PostgrestTransformBuilder2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js
  var require_PostgrestFilterBuilder = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestFilterBuilder.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
      var PostgrestFilterBuilder2 = class extends PostgrestTransformBuilder_1.default {
        /**
         * Match only rows where `column` is equal to `value`.
         *
         * To check if the value of `column` is NULL, you should use `.is()` instead.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        eq(column, value) {
          this.url.searchParams.append(column, `eq.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is not equal to `value`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        neq(column, value) {
          this.url.searchParams.append(column, `neq.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is greater than `value`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        gt(column, value) {
          this.url.searchParams.append(column, `gt.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is greater than or equal to `value`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        gte(column, value) {
          this.url.searchParams.append(column, `gte.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is less than `value`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        lt(column, value) {
          this.url.searchParams.append(column, `lt.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is less than or equal to `value`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        lte(column, value) {
          this.url.searchParams.append(column, `lte.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` matches `pattern` case-sensitively.
         *
         * @param column - The column to filter on
         * @param pattern - The pattern to match with
         */
        like(column, pattern) {
          this.url.searchParams.append(column, `like.${pattern}`);
          return this;
        }
        /**
         * Match only rows where `column` matches all of `patterns` case-sensitively.
         *
         * @param column - The column to filter on
         * @param patterns - The patterns to match with
         */
        likeAllOf(column, patterns) {
          this.url.searchParams.append(column, `like(all).{${patterns.join(",")}}`);
          return this;
        }
        /**
         * Match only rows where `column` matches any of `patterns` case-sensitively.
         *
         * @param column - The column to filter on
         * @param patterns - The patterns to match with
         */
        likeAnyOf(column, patterns) {
          this.url.searchParams.append(column, `like(any).{${patterns.join(",")}}`);
          return this;
        }
        /**
         * Match only rows where `column` matches `pattern` case-insensitively.
         *
         * @param column - The column to filter on
         * @param pattern - The pattern to match with
         */
        ilike(column, pattern) {
          this.url.searchParams.append(column, `ilike.${pattern}`);
          return this;
        }
        /**
         * Match only rows where `column` matches all of `patterns` case-insensitively.
         *
         * @param column - The column to filter on
         * @param patterns - The patterns to match with
         */
        ilikeAllOf(column, patterns) {
          this.url.searchParams.append(column, `ilike(all).{${patterns.join(",")}}`);
          return this;
        }
        /**
         * Match only rows where `column` matches any of `patterns` case-insensitively.
         *
         * @param column - The column to filter on
         * @param patterns - The patterns to match with
         */
        ilikeAnyOf(column, patterns) {
          this.url.searchParams.append(column, `ilike(any).{${patterns.join(",")}}`);
          return this;
        }
        /**
         * Match only rows where `column` IS `value`.
         *
         * For non-boolean columns, this is only relevant for checking if the value of
         * `column` is NULL by setting `value` to `null`.
         *
         * For boolean columns, you can also set `value` to `true` or `false` and it
         * will behave the same way as `.eq()`.
         *
         * @param column - The column to filter on
         * @param value - The value to filter with
         */
        is(column, value) {
          this.url.searchParams.append(column, `is.${value}`);
          return this;
        }
        /**
         * Match only rows where `column` is included in the `values` array.
         *
         * @param column - The column to filter on
         * @param values - The values array to filter with
         */
        in(column, values) {
          const cleanedValues = Array.from(new Set(values)).map((s) => {
            if (typeof s === "string" && new RegExp("[,()]").test(s))
              return `"${s}"`;
            else
              return `${s}`;
          }).join(",");
          this.url.searchParams.append(column, `in.(${cleanedValues})`);
          return this;
        }
        /**
         * Only relevant for jsonb, array, and range columns. Match only rows where
         * `column` contains every element appearing in `value`.
         *
         * @param column - The jsonb, array, or range column to filter on
         * @param value - The jsonb, array, or range value to filter with
         */
        contains(column, value) {
          if (typeof value === "string") {
            this.url.searchParams.append(column, `cs.${value}`);
          } else if (Array.isArray(value)) {
            this.url.searchParams.append(column, `cs.{${value.join(",")}}`);
          } else {
            this.url.searchParams.append(column, `cs.${JSON.stringify(value)}`);
          }
          return this;
        }
        /**
         * Only relevant for jsonb, array, and range columns. Match only rows where
         * every element appearing in `column` is contained by `value`.
         *
         * @param column - The jsonb, array, or range column to filter on
         * @param value - The jsonb, array, or range value to filter with
         */
        containedBy(column, value) {
          if (typeof value === "string") {
            this.url.searchParams.append(column, `cd.${value}`);
          } else if (Array.isArray(value)) {
            this.url.searchParams.append(column, `cd.{${value.join(",")}}`);
          } else {
            this.url.searchParams.append(column, `cd.${JSON.stringify(value)}`);
          }
          return this;
        }
        /**
         * Only relevant for range columns. Match only rows where every element in
         * `column` is greater than any element in `range`.
         *
         * @param column - The range column to filter on
         * @param range - The range to filter with
         */
        rangeGt(column, range) {
          this.url.searchParams.append(column, `sr.${range}`);
          return this;
        }
        /**
         * Only relevant for range columns. Match only rows where every element in
         * `column` is either contained in `range` or greater than any element in
         * `range`.
         *
         * @param column - The range column to filter on
         * @param range - The range to filter with
         */
        rangeGte(column, range) {
          this.url.searchParams.append(column, `nxl.${range}`);
          return this;
        }
        /**
         * Only relevant for range columns. Match only rows where every element in
         * `column` is less than any element in `range`.
         *
         * @param column - The range column to filter on
         * @param range - The range to filter with
         */
        rangeLt(column, range) {
          this.url.searchParams.append(column, `sl.${range}`);
          return this;
        }
        /**
         * Only relevant for range columns. Match only rows where every element in
         * `column` is either contained in `range` or less than any element in
         * `range`.
         *
         * @param column - The range column to filter on
         * @param range - The range to filter with
         */
        rangeLte(column, range) {
          this.url.searchParams.append(column, `nxr.${range}`);
          return this;
        }
        /**
         * Only relevant for range columns. Match only rows where `column` is
         * mutually exclusive to `range` and there can be no element between the two
         * ranges.
         *
         * @param column - The range column to filter on
         * @param range - The range to filter with
         */
        rangeAdjacent(column, range) {
          this.url.searchParams.append(column, `adj.${range}`);
          return this;
        }
        /**
         * Only relevant for array and range columns. Match only rows where
         * `column` and `value` have an element in common.
         *
         * @param column - The array or range column to filter on
         * @param value - The array or range value to filter with
         */
        overlaps(column, value) {
          if (typeof value === "string") {
            this.url.searchParams.append(column, `ov.${value}`);
          } else {
            this.url.searchParams.append(column, `ov.{${value.join(",")}}`);
          }
          return this;
        }
        /**
         * Only relevant for text and tsvector columns. Match only rows where
         * `column` matches the query string in `query`.
         *
         * @param column - The text or tsvector column to filter on
         * @param query - The query text to match with
         * @param options - Named parameters
         * @param options.config - The text search configuration to use
         * @param options.type - Change how the `query` text is interpreted
         */
        textSearch(column, query, { config, type } = {}) {
          let typePart = "";
          if (type === "plain") {
            typePart = "pl";
          } else if (type === "phrase") {
            typePart = "ph";
          } else if (type === "websearch") {
            typePart = "w";
          }
          const configPart = config === void 0 ? "" : `(${config})`;
          this.url.searchParams.append(column, `${typePart}fts${configPart}.${query}`);
          return this;
        }
        /**
         * Match only rows where each column in `query` keys is equal to its
         * associated value. Shorthand for multiple `.eq()`s.
         *
         * @param query - The object to filter with, with column names as keys mapped
         * to their filter values
         */
        match(query) {
          Object.entries(query).forEach(([column, value]) => {
            this.url.searchParams.append(column, `eq.${value}`);
          });
          return this;
        }
        /**
         * Match only rows which doesn't satisfy the filter.
         *
         * Unlike most filters, `opearator` and `value` are used as-is and need to
         * follow [PostgREST
         * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
         * to make sure they are properly sanitized.
         *
         * @param column - The column to filter on
         * @param operator - The operator to be negated to filter with, following
         * PostgREST syntax
         * @param value - The value to filter with, following PostgREST syntax
         */
        not(column, operator, value) {
          this.url.searchParams.append(column, `not.${operator}.${value}`);
          return this;
        }
        /**
         * Match only rows which satisfy at least one of the filters.
         *
         * Unlike most filters, `filters` is used as-is and needs to follow [PostgREST
         * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
         * to make sure it's properly sanitized.
         *
         * It's currently not possible to do an `.or()` filter across multiple tables.
         *
         * @param filters - The filters to use, following PostgREST syntax
         * @param options - Named parameters
         * @param options.referencedTable - Set this to filter on referenced tables
         * instead of the parent table
         * @param options.foreignTable - Deprecated, use `referencedTable` instead
         */
        or(filters, { foreignTable, referencedTable = foreignTable } = {}) {
          const key = referencedTable ? `${referencedTable}.or` : "or";
          this.url.searchParams.append(key, `(${filters})`);
          return this;
        }
        /**
         * Match only rows which satisfy the filter. This is an escape hatch - you
         * should use the specific filter methods wherever possible.
         *
         * Unlike most filters, `opearator` and `value` are used as-is and need to
         * follow [PostgREST
         * syntax](https://postgrest.org/en/stable/api.html#operators). You also need
         * to make sure they are properly sanitized.
         *
         * @param column - The column to filter on
         * @param operator - The operator to filter with, following PostgREST syntax
         * @param value - The value to filter with, following PostgREST syntax
         */
        filter(column, operator, value) {
          this.url.searchParams.append(column, `${operator}.${value}`);
          return this;
        }
      };
      exports.default = PostgrestFilterBuilder2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js
  var require_PostgrestQueryBuilder = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestQueryBuilder.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
      var PostgrestQueryBuilder2 = class {
        constructor(url, { headers = {}, schema, fetch: fetch3 }) {
          this.url = url;
          this.headers = headers;
          this.schema = schema;
          this.fetch = fetch3;
        }
        /**
         * Perform a SELECT query on the table or view.
         *
         * @param columns - The columns to retrieve, separated by commas. Columns can be renamed when returned with `customName:columnName`
         *
         * @param options - Named parameters
         *
         * @param options.head - When set to `true`, `data` will not be returned.
         * Useful if you only need the count.
         *
         * @param options.count - Count algorithm to use to count rows in the table or view.
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         */
        select(columns, { head: head2 = false, count } = {}) {
          const method = head2 ? "HEAD" : "GET";
          let quoted = false;
          const cleanedColumns = (columns !== null && columns !== void 0 ? columns : "*").split("").map((c) => {
            if (/\s/.test(c) && !quoted) {
              return "";
            }
            if (c === '"') {
              quoted = !quoted;
            }
            return c;
          }).join("");
          this.url.searchParams.set("select", cleanedColumns);
          if (count) {
            this.headers["Prefer"] = `count=${count}`;
          }
          return new PostgrestFilterBuilder_1.default({
            method,
            url: this.url,
            headers: this.headers,
            schema: this.schema,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
        /**
         * Perform an INSERT into the table or view.
         *
         * By default, inserted rows are not returned. To return it, chain the call
         * with `.select()`.
         *
         * @param values - The values to insert. Pass an object to insert a single row
         * or an array to insert multiple rows.
         *
         * @param options - Named parameters
         *
         * @param options.count - Count algorithm to use to count inserted rows.
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         *
         * @param options.defaultToNull - Make missing fields default to `null`.
         * Otherwise, use the default value for the column. Only applies for bulk
         * inserts.
         */
        insert(values, { count, defaultToNull = true } = {}) {
          const method = "POST";
          const prefersHeaders = [];
          if (this.headers["Prefer"]) {
            prefersHeaders.push(this.headers["Prefer"]);
          }
          if (count) {
            prefersHeaders.push(`count=${count}`);
          }
          if (!defaultToNull) {
            prefersHeaders.push("missing=default");
          }
          this.headers["Prefer"] = prefersHeaders.join(",");
          if (Array.isArray(values)) {
            const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
            if (columns.length > 0) {
              const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
              this.url.searchParams.set("columns", uniqueColumns.join(","));
            }
          }
          return new PostgrestFilterBuilder_1.default({
            method,
            url: this.url,
            headers: this.headers,
            schema: this.schema,
            body: values,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
        /**
         * Perform an UPSERT on the table or view. Depending on the column(s) passed
         * to `onConflict`, `.upsert()` allows you to perform the equivalent of
         * `.insert()` if a row with the corresponding `onConflict` columns doesn't
         * exist, or if it does exist, perform an alternative action depending on
         * `ignoreDuplicates`.
         *
         * By default, upserted rows are not returned. To return it, chain the call
         * with `.select()`.
         *
         * @param values - The values to upsert with. Pass an object to upsert a
         * single row or an array to upsert multiple rows.
         *
         * @param options - Named parameters
         *
         * @param options.onConflict - Comma-separated UNIQUE column(s) to specify how
         * duplicate rows are determined. Two rows are duplicates if all the
         * `onConflict` columns are equal.
         *
         * @param options.ignoreDuplicates - If `true`, duplicate rows are ignored. If
         * `false`, duplicate rows are merged with existing rows.
         *
         * @param options.count - Count algorithm to use to count upserted rows.
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         *
         * @param options.defaultToNull - Make missing fields default to `null`.
         * Otherwise, use the default value for the column. This only applies when
         * inserting new rows, not when merging with existing rows under
         * `ignoreDuplicates: false`. This also only applies when doing bulk upserts.
         */
        upsert(values, { onConflict, ignoreDuplicates = false, count, defaultToNull = true } = {}) {
          const method = "POST";
          const prefersHeaders = [`resolution=${ignoreDuplicates ? "ignore" : "merge"}-duplicates`];
          if (onConflict !== void 0)
            this.url.searchParams.set("on_conflict", onConflict);
          if (this.headers["Prefer"]) {
            prefersHeaders.push(this.headers["Prefer"]);
          }
          if (count) {
            prefersHeaders.push(`count=${count}`);
          }
          if (!defaultToNull) {
            prefersHeaders.push("missing=default");
          }
          this.headers["Prefer"] = prefersHeaders.join(",");
          if (Array.isArray(values)) {
            const columns = values.reduce((acc, x) => acc.concat(Object.keys(x)), []);
            if (columns.length > 0) {
              const uniqueColumns = [...new Set(columns)].map((column) => `"${column}"`);
              this.url.searchParams.set("columns", uniqueColumns.join(","));
            }
          }
          return new PostgrestFilterBuilder_1.default({
            method,
            url: this.url,
            headers: this.headers,
            schema: this.schema,
            body: values,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
        /**
         * Perform an UPDATE on the table or view.
         *
         * By default, updated rows are not returned. To return it, chain the call
         * with `.select()` after filters.
         *
         * @param values - The values to update with
         *
         * @param options - Named parameters
         *
         * @param options.count - Count algorithm to use to count updated rows.
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         */
        update(values, { count } = {}) {
          const method = "PATCH";
          const prefersHeaders = [];
          if (this.headers["Prefer"]) {
            prefersHeaders.push(this.headers["Prefer"]);
          }
          if (count) {
            prefersHeaders.push(`count=${count}`);
          }
          this.headers["Prefer"] = prefersHeaders.join(",");
          return new PostgrestFilterBuilder_1.default({
            method,
            url: this.url,
            headers: this.headers,
            schema: this.schema,
            body: values,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
        /**
         * Perform a DELETE on the table or view.
         *
         * By default, deleted rows are not returned. To return it, chain the call
         * with `.select()` after filters.
         *
         * @param options - Named parameters
         *
         * @param options.count - Count algorithm to use to count deleted rows.
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         */
        delete({ count } = {}) {
          const method = "DELETE";
          const prefersHeaders = [];
          if (count) {
            prefersHeaders.push(`count=${count}`);
          }
          if (this.headers["Prefer"]) {
            prefersHeaders.unshift(this.headers["Prefer"]);
          }
          this.headers["Prefer"] = prefersHeaders.join(",");
          return new PostgrestFilterBuilder_1.default({
            method,
            url: this.url,
            headers: this.headers,
            schema: this.schema,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
      };
      exports.default = PostgrestQueryBuilder2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/version.js
  var require_version = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/version.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.version = void 0;
      exports.version = "0.0.0-automated";
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/constants.js
  var require_constants = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/constants.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.DEFAULT_HEADERS = void 0;
      var version_1 = require_version();
      exports.DEFAULT_HEADERS = { "X-Client-Info": `postgrest-js/${version_1.version}` };
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js
  var require_PostgrestClient = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/PostgrestClient.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
      var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
      var constants_1 = require_constants();
      var PostgrestClient2 = class _PostgrestClient {
        // TODO: Add back shouldThrowOnError once we figure out the typings
        /**
         * Creates a PostgREST client.
         *
         * @param url - URL of the PostgREST endpoint
         * @param options - Named parameters
         * @param options.headers - Custom headers
         * @param options.schema - Postgres schema to switch to
         * @param options.fetch - Custom fetch
         */
        constructor(url, { headers = {}, schema, fetch: fetch3 } = {}) {
          this.url = url;
          this.headers = Object.assign(Object.assign({}, constants_1.DEFAULT_HEADERS), headers);
          this.schemaName = schema;
          this.fetch = fetch3;
        }
        /**
         * Perform a query on a table or a view.
         *
         * @param relation - The table or view name to query
         */
        from(relation) {
          const url = new URL(`${this.url}/${relation}`);
          return new PostgrestQueryBuilder_1.default(url, {
            headers: Object.assign({}, this.headers),
            schema: this.schemaName,
            fetch: this.fetch
          });
        }
        /**
         * Select a schema to query or perform an function (rpc) call.
         *
         * The schema needs to be on the list of exposed schemas inside Supabase.
         *
         * @param schema - The schema to query
         */
        schema(schema) {
          return new _PostgrestClient(this.url, {
            headers: this.headers,
            schema,
            fetch: this.fetch
          });
        }
        /**
         * Perform a function call.
         *
         * @param fn - The function name to call
         * @param args - The arguments to pass to the function call
         * @param options - Named parameters
         * @param options.head - When set to `true`, `data` will not be returned.
         * Useful if you only need the count.
         * @param options.get - When set to `true`, the function will be called with
         * read-only access mode.
         * @param options.count - Count algorithm to use to count rows returned by the
         * function. Only applicable for [set-returning
         * functions](https://www.postgresql.org/docs/current/functions-srf.html).
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         */
        rpc(fn, args = {}, { head: head2 = false, get: get2 = false, count } = {}) {
          let method;
          const url = new URL(`${this.url}/rpc/${fn}`);
          let body;
          if (head2 || get2) {
            method = head2 ? "HEAD" : "GET";
            Object.entries(args).filter(([_, value]) => value !== void 0).map(([name, value]) => [name, Array.isArray(value) ? `{${value.join(",")}}` : `${value}`]).forEach(([name, value]) => {
              url.searchParams.append(name, value);
            });
          } else {
            method = "POST";
            body = args;
          }
          const headers = Object.assign({}, this.headers);
          if (count) {
            headers["Prefer"] = `count=${count}`;
          }
          return new PostgrestFilterBuilder_1.default({
            method,
            url,
            headers,
            schema: this.schemaName,
            body,
            fetch: this.fetch,
            allowEmpty: false
          });
        }
      };
      exports.default = PostgrestClient2;
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/cjs/index.js
  var require_cjs = __commonJS({
    "project/node_modules/@supabase/postgrest-js/dist/cjs/index.js"(exports) {
      "use strict";
      var __importDefault = exports && exports.__importDefault || function(mod) {
        return mod && mod.__esModule ? mod : { "default": mod };
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.PostgrestError = exports.PostgrestBuilder = exports.PostgrestTransformBuilder = exports.PostgrestFilterBuilder = exports.PostgrestQueryBuilder = exports.PostgrestClient = void 0;
      var PostgrestClient_1 = __importDefault(require_PostgrestClient());
      exports.PostgrestClient = PostgrestClient_1.default;
      var PostgrestQueryBuilder_1 = __importDefault(require_PostgrestQueryBuilder());
      exports.PostgrestQueryBuilder = PostgrestQueryBuilder_1.default;
      var PostgrestFilterBuilder_1 = __importDefault(require_PostgrestFilterBuilder());
      exports.PostgrestFilterBuilder = PostgrestFilterBuilder_1.default;
      var PostgrestTransformBuilder_1 = __importDefault(require_PostgrestTransformBuilder());
      exports.PostgrestTransformBuilder = PostgrestTransformBuilder_1.default;
      var PostgrestBuilder_1 = __importDefault(require_PostgrestBuilder());
      exports.PostgrestBuilder = PostgrestBuilder_1.default;
      var PostgrestError_1 = __importDefault(require_PostgrestError());
      exports.PostgrestError = PostgrestError_1.default;
      exports.default = {
        PostgrestClient: PostgrestClient_1.default,
        PostgrestQueryBuilder: PostgrestQueryBuilder_1.default,
        PostgrestFilterBuilder: PostgrestFilterBuilder_1.default,
        PostgrestTransformBuilder: PostgrestTransformBuilder_1.default,
        PostgrestBuilder: PostgrestBuilder_1.default,
        PostgrestError: PostgrestError_1.default
      };
    }
  });

  // project/node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs
  var import_cjs, PostgrestClient, PostgrestQueryBuilder, PostgrestFilterBuilder, PostgrestTransformBuilder, PostgrestBuilder, PostgrestError;
  var init_wrapper = __esm({
    "project/node_modules/@supabase/postgrest-js/dist/esm/wrapper.mjs"() {
      import_cjs = __toESM(require_cjs(), 1);
      ({
        PostgrestClient,
        PostgrestQueryBuilder,
        PostgrestFilterBuilder,
        PostgrestTransformBuilder,
        PostgrestBuilder,
        PostgrestError
      } = import_cjs.default);
    }
  });

  // project/node_modules/ws/browser.js
  var require_browser = __commonJS({
    "project/node_modules/ws/browser.js"(exports, module) {
      "use strict";
      module.exports = function() {
        throw new Error(
          "ws does not work in the browser. Browser clients must use the native WebSocket object"
        );
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/WebSocket.js
  var WebSocketImpl, WebSocket_default;
  var init_WebSocket = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/WebSocket.js"() {
      if (typeof window === "undefined") {
        WebSocketImpl = require_browser();
      } else {
        WebSocketImpl = window.WebSocket;
      }
      WebSocket_default = WebSocketImpl;
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/version.js
  var version;
  var init_version = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/version.js"() {
      version = "2.11.10";
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/constants.js
  var DEFAULT_HEADERS, VSN, DEFAULT_TIMEOUT, WS_CLOSE_NORMAL, SOCKET_STATES, CHANNEL_STATES, CHANNEL_EVENTS, TRANSPORTS, CONNECTION_STATE;
  var init_constants = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/constants.js"() {
      init_version();
      DEFAULT_HEADERS = { "X-Client-Info": `realtime-js/${version}` };
      VSN = "1.0.0";
      DEFAULT_TIMEOUT = 1e4;
      WS_CLOSE_NORMAL = 1e3;
      (function(SOCKET_STATES2) {
        SOCKET_STATES2[SOCKET_STATES2["connecting"] = 0] = "connecting";
        SOCKET_STATES2[SOCKET_STATES2["open"] = 1] = "open";
        SOCKET_STATES2[SOCKET_STATES2["closing"] = 2] = "closing";
        SOCKET_STATES2[SOCKET_STATES2["closed"] = 3] = "closed";
      })(SOCKET_STATES || (SOCKET_STATES = {}));
      (function(CHANNEL_STATES2) {
        CHANNEL_STATES2["closed"] = "closed";
        CHANNEL_STATES2["errored"] = "errored";
        CHANNEL_STATES2["joined"] = "joined";
        CHANNEL_STATES2["joining"] = "joining";
        CHANNEL_STATES2["leaving"] = "leaving";
      })(CHANNEL_STATES || (CHANNEL_STATES = {}));
      (function(CHANNEL_EVENTS2) {
        CHANNEL_EVENTS2["close"] = "phx_close";
        CHANNEL_EVENTS2["error"] = "phx_error";
        CHANNEL_EVENTS2["join"] = "phx_join";
        CHANNEL_EVENTS2["reply"] = "phx_reply";
        CHANNEL_EVENTS2["leave"] = "phx_leave";
        CHANNEL_EVENTS2["access_token"] = "access_token";
      })(CHANNEL_EVENTS || (CHANNEL_EVENTS = {}));
      (function(TRANSPORTS2) {
        TRANSPORTS2["websocket"] = "websocket";
      })(TRANSPORTS || (TRANSPORTS = {}));
      (function(CONNECTION_STATE2) {
        CONNECTION_STATE2["Connecting"] = "connecting";
        CONNECTION_STATE2["Open"] = "open";
        CONNECTION_STATE2["Closing"] = "closing";
        CONNECTION_STATE2["Closed"] = "closed";
      })(CONNECTION_STATE || (CONNECTION_STATE = {}));
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/serializer.js
  var Serializer;
  var init_serializer = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/serializer.js"() {
      Serializer = class {
        constructor() {
          this.HEADER_LENGTH = 1;
        }
        decode(rawPayload, callback) {
          if (rawPayload.constructor === ArrayBuffer) {
            return callback(this._binaryDecode(rawPayload));
          }
          if (typeof rawPayload === "string") {
            return callback(JSON.parse(rawPayload));
          }
          return callback({});
        }
        _binaryDecode(buffer) {
          const view = new DataView(buffer);
          const decoder = new TextDecoder();
          return this._decodeBroadcast(buffer, view, decoder);
        }
        _decodeBroadcast(buffer, view, decoder) {
          const topicSize = view.getUint8(1);
          const eventSize = view.getUint8(2);
          let offset = this.HEADER_LENGTH + 2;
          const topic = decoder.decode(buffer.slice(offset, offset + topicSize));
          offset = offset + topicSize;
          const event = decoder.decode(buffer.slice(offset, offset + eventSize));
          offset = offset + eventSize;
          const data = JSON.parse(decoder.decode(buffer.slice(offset, buffer.byteLength)));
          return { ref: null, topic, event, payload: data };
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/timer.js
  var Timer;
  var init_timer = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/timer.js"() {
      Timer = class {
        constructor(callback, timerCalc) {
          this.callback = callback;
          this.timerCalc = timerCalc;
          this.timer = void 0;
          this.tries = 0;
          this.callback = callback;
          this.timerCalc = timerCalc;
        }
        reset() {
          this.tries = 0;
          clearTimeout(this.timer);
        }
        // Cancels any previous scheduleTimeout and schedules callback
        scheduleTimeout() {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => {
            this.tries = this.tries + 1;
            this.callback();
          }, this.timerCalc(this.tries + 1));
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/transformers.js
  var PostgresTypes, convertChangeData, convertColumn, convertCell, noop, toBoolean, toNumber, toJson, toArray, toTimestampString, httpEndpointURL;
  var init_transformers = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/transformers.js"() {
      (function(PostgresTypes2) {
        PostgresTypes2["abstime"] = "abstime";
        PostgresTypes2["bool"] = "bool";
        PostgresTypes2["date"] = "date";
        PostgresTypes2["daterange"] = "daterange";
        PostgresTypes2["float4"] = "float4";
        PostgresTypes2["float8"] = "float8";
        PostgresTypes2["int2"] = "int2";
        PostgresTypes2["int4"] = "int4";
        PostgresTypes2["int4range"] = "int4range";
        PostgresTypes2["int8"] = "int8";
        PostgresTypes2["int8range"] = "int8range";
        PostgresTypes2["json"] = "json";
        PostgresTypes2["jsonb"] = "jsonb";
        PostgresTypes2["money"] = "money";
        PostgresTypes2["numeric"] = "numeric";
        PostgresTypes2["oid"] = "oid";
        PostgresTypes2["reltime"] = "reltime";
        PostgresTypes2["text"] = "text";
        PostgresTypes2["time"] = "time";
        PostgresTypes2["timestamp"] = "timestamp";
        PostgresTypes2["timestamptz"] = "timestamptz";
        PostgresTypes2["timetz"] = "timetz";
        PostgresTypes2["tsrange"] = "tsrange";
        PostgresTypes2["tstzrange"] = "tstzrange";
      })(PostgresTypes || (PostgresTypes = {}));
      convertChangeData = (columns, record, options = {}) => {
        var _a;
        const skipTypes = (_a = options.skipTypes) !== null && _a !== void 0 ? _a : [];
        return Object.keys(record).reduce((acc, rec_key) => {
          acc[rec_key] = convertColumn(rec_key, columns, record, skipTypes);
          return acc;
        }, {});
      };
      convertColumn = (columnName, columns, record, skipTypes) => {
        const column = columns.find((x) => x.name === columnName);
        const colType = column === null || column === void 0 ? void 0 : column.type;
        const value = record[columnName];
        if (colType && !skipTypes.includes(colType)) {
          return convertCell(colType, value);
        }
        return noop(value);
      };
      convertCell = (type, value) => {
        if (type.charAt(0) === "_") {
          const dataType = type.slice(1, type.length);
          return toArray(value, dataType);
        }
        switch (type) {
          case PostgresTypes.bool:
            return toBoolean(value);
          case PostgresTypes.float4:
          case PostgresTypes.float8:
          case PostgresTypes.int2:
          case PostgresTypes.int4:
          case PostgresTypes.int8:
          case PostgresTypes.numeric:
          case PostgresTypes.oid:
            return toNumber(value);
          case PostgresTypes.json:
          case PostgresTypes.jsonb:
            return toJson(value);
          case PostgresTypes.timestamp:
            return toTimestampString(value);
          // Format to be consistent with PostgREST
          case PostgresTypes.abstime:
          // To allow users to cast it based on Timezone
          case PostgresTypes.date:
          // To allow users to cast it based on Timezone
          case PostgresTypes.daterange:
          case PostgresTypes.int4range:
          case PostgresTypes.int8range:
          case PostgresTypes.money:
          case PostgresTypes.reltime:
          // To allow users to cast it based on Timezone
          case PostgresTypes.text:
          case PostgresTypes.time:
          // To allow users to cast it based on Timezone
          case PostgresTypes.timestamptz:
          // To allow users to cast it based on Timezone
          case PostgresTypes.timetz:
          // To allow users to cast it based on Timezone
          case PostgresTypes.tsrange:
          case PostgresTypes.tstzrange:
            return noop(value);
          default:
            return noop(value);
        }
      };
      noop = (value) => {
        return value;
      };
      toBoolean = (value) => {
        switch (value) {
          case "t":
            return true;
          case "f":
            return false;
          default:
            return value;
        }
      };
      toNumber = (value) => {
        if (typeof value === "string") {
          const parsedValue = parseFloat(value);
          if (!Number.isNaN(parsedValue)) {
            return parsedValue;
          }
        }
        return value;
      };
      toJson = (value) => {
        if (typeof value === "string") {
          try {
            return JSON.parse(value);
          } catch (error) {
            console.log(`JSON parse error: ${error}`);
            return value;
          }
        }
        return value;
      };
      toArray = (value, type) => {
        if (typeof value !== "string") {
          return value;
        }
        const lastIdx = value.length - 1;
        const closeBrace = value[lastIdx];
        const openBrace = value[0];
        if (openBrace === "{" && closeBrace === "}") {
          let arr;
          const valTrim = value.slice(1, lastIdx);
          try {
            arr = JSON.parse("[" + valTrim + "]");
          } catch (_) {
            arr = valTrim ? valTrim.split(",") : [];
          }
          return arr.map((val) => convertCell(type, val));
        }
        return value;
      };
      toTimestampString = (value) => {
        if (typeof value === "string") {
          return value.replace(" ", "T");
        }
        return value;
      };
      httpEndpointURL = (socketUrl) => {
        let url = socketUrl;
        url = url.replace(/^ws/i, "http");
        url = url.replace(/(\/socket\/websocket|\/socket|\/websocket)\/?$/i, "");
        return url.replace(/\/+$/, "");
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/lib/push.js
  var Push;
  var init_push = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/lib/push.js"() {
      init_constants();
      Push = class {
        /**
         * Initializes the Push
         *
         * @param channel The Channel
         * @param event The event, for example `"phx_join"`
         * @param payload The payload, for example `{user_id: 123}`
         * @param timeout The push timeout in milliseconds
         */
        constructor(channel, event, payload = {}, timeout = DEFAULT_TIMEOUT) {
          this.channel = channel;
          this.event = event;
          this.payload = payload;
          this.timeout = timeout;
          this.sent = false;
          this.timeoutTimer = void 0;
          this.ref = "";
          this.receivedResp = null;
          this.recHooks = [];
          this.refEvent = null;
        }
        resend(timeout) {
          this.timeout = timeout;
          this._cancelRefEvent();
          this.ref = "";
          this.refEvent = null;
          this.receivedResp = null;
          this.sent = false;
          this.send();
        }
        send() {
          if (this._hasReceived("timeout")) {
            return;
          }
          this.startTimeout();
          this.sent = true;
          this.channel.socket.push({
            topic: this.channel.topic,
            event: this.event,
            payload: this.payload,
            ref: this.ref,
            join_ref: this.channel._joinRef()
          });
        }
        updatePayload(payload) {
          this.payload = Object.assign(Object.assign({}, this.payload), payload);
        }
        receive(status, callback) {
          var _a;
          if (this._hasReceived(status)) {
            callback((_a = this.receivedResp) === null || _a === void 0 ? void 0 : _a.response);
          }
          this.recHooks.push({ status, callback });
          return this;
        }
        startTimeout() {
          if (this.timeoutTimer) {
            return;
          }
          this.ref = this.channel.socket._makeRef();
          this.refEvent = this.channel._replyEventName(this.ref);
          const callback = (payload) => {
            this._cancelRefEvent();
            this._cancelTimeout();
            this.receivedResp = payload;
            this._matchReceive(payload);
          };
          this.channel._on(this.refEvent, {}, callback);
          this.timeoutTimer = setTimeout(() => {
            this.trigger("timeout", {});
          }, this.timeout);
        }
        trigger(status, response) {
          if (this.refEvent)
            this.channel._trigger(this.refEvent, { status, response });
        }
        destroy() {
          this._cancelRefEvent();
          this._cancelTimeout();
        }
        _cancelRefEvent() {
          if (!this.refEvent) {
            return;
          }
          this.channel._off(this.refEvent, {});
        }
        _cancelTimeout() {
          clearTimeout(this.timeoutTimer);
          this.timeoutTimer = void 0;
        }
        _matchReceive({ status, response }) {
          this.recHooks.filter((h) => h.status === status).forEach((h) => h.callback(response));
        }
        _hasReceived(status) {
          return this.receivedResp && this.receivedResp.status === status;
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js
  var REALTIME_PRESENCE_LISTEN_EVENTS, RealtimePresence;
  var init_RealtimePresence = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/RealtimePresence.js"() {
      (function(REALTIME_PRESENCE_LISTEN_EVENTS2) {
        REALTIME_PRESENCE_LISTEN_EVENTS2["SYNC"] = "sync";
        REALTIME_PRESENCE_LISTEN_EVENTS2["JOIN"] = "join";
        REALTIME_PRESENCE_LISTEN_EVENTS2["LEAVE"] = "leave";
      })(REALTIME_PRESENCE_LISTEN_EVENTS || (REALTIME_PRESENCE_LISTEN_EVENTS = {}));
      RealtimePresence = class _RealtimePresence {
        /**
         * Initializes the Presence.
         *
         * @param channel - The RealtimeChannel
         * @param opts - The options,
         *        for example `{events: {state: 'state', diff: 'diff'}}`
         */
        constructor(channel, opts) {
          this.channel = channel;
          this.state = {};
          this.pendingDiffs = [];
          this.joinRef = null;
          this.caller = {
            onJoin: () => {
            },
            onLeave: () => {
            },
            onSync: () => {
            }
          };
          const events = (opts === null || opts === void 0 ? void 0 : opts.events) || {
            state: "presence_state",
            diff: "presence_diff"
          };
          this.channel._on(events.state, {}, (newState) => {
            const { onJoin, onLeave, onSync } = this.caller;
            this.joinRef = this.channel._joinRef();
            this.state = _RealtimePresence.syncState(this.state, newState, onJoin, onLeave);
            this.pendingDiffs.forEach((diff) => {
              this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
            });
            this.pendingDiffs = [];
            onSync();
          });
          this.channel._on(events.diff, {}, (diff) => {
            const { onJoin, onLeave, onSync } = this.caller;
            if (this.inPendingSyncState()) {
              this.pendingDiffs.push(diff);
            } else {
              this.state = _RealtimePresence.syncDiff(this.state, diff, onJoin, onLeave);
              onSync();
            }
          });
          this.onJoin((key, currentPresences, newPresences) => {
            this.channel._trigger("presence", {
              event: "join",
              key,
              currentPresences,
              newPresences
            });
          });
          this.onLeave((key, currentPresences, leftPresences) => {
            this.channel._trigger("presence", {
              event: "leave",
              key,
              currentPresences,
              leftPresences
            });
          });
          this.onSync(() => {
            this.channel._trigger("presence", { event: "sync" });
          });
        }
        /**
         * Used to sync the list of presences on the server with the
         * client's state.
         *
         * An optional `onJoin` and `onLeave` callback can be provided to
         * react to changes in the client's local presences across
         * disconnects and reconnects with the server.
         *
         * @internal
         */
        static syncState(currentState, newState, onJoin, onLeave) {
          const state = this.cloneDeep(currentState);
          const transformedState = this.transformState(newState);
          const joins = {};
          const leaves = {};
          this.map(state, (key, presences) => {
            if (!transformedState[key]) {
              leaves[key] = presences;
            }
          });
          this.map(transformedState, (key, newPresences) => {
            const currentPresences = state[key];
            if (currentPresences) {
              const newPresenceRefs = newPresences.map((m) => m.presence_ref);
              const curPresenceRefs = currentPresences.map((m) => m.presence_ref);
              const joinedPresences = newPresences.filter((m) => curPresenceRefs.indexOf(m.presence_ref) < 0);
              const leftPresences = currentPresences.filter((m) => newPresenceRefs.indexOf(m.presence_ref) < 0);
              if (joinedPresences.length > 0) {
                joins[key] = joinedPresences;
              }
              if (leftPresences.length > 0) {
                leaves[key] = leftPresences;
              }
            } else {
              joins[key] = newPresences;
            }
          });
          return this.syncDiff(state, { joins, leaves }, onJoin, onLeave);
        }
        /**
         * Used to sync a diff of presence join and leave events from the
         * server, as they happen.
         *
         * Like `syncState`, `syncDiff` accepts optional `onJoin` and
         * `onLeave` callbacks to react to a user joining or leaving from a
         * device.
         *
         * @internal
         */
        static syncDiff(state, diff, onJoin, onLeave) {
          const { joins, leaves } = {
            joins: this.transformState(diff.joins),
            leaves: this.transformState(diff.leaves)
          };
          if (!onJoin) {
            onJoin = () => {
            };
          }
          if (!onLeave) {
            onLeave = () => {
            };
          }
          this.map(joins, (key, newPresences) => {
            var _a;
            const currentPresences = (_a = state[key]) !== null && _a !== void 0 ? _a : [];
            state[key] = this.cloneDeep(newPresences);
            if (currentPresences.length > 0) {
              const joinedPresenceRefs = state[key].map((m) => m.presence_ref);
              const curPresences = currentPresences.filter((m) => joinedPresenceRefs.indexOf(m.presence_ref) < 0);
              state[key].unshift(...curPresences);
            }
            onJoin(key, currentPresences, newPresences);
          });
          this.map(leaves, (key, leftPresences) => {
            let currentPresences = state[key];
            if (!currentPresences)
              return;
            const presenceRefsToRemove = leftPresences.map((m) => m.presence_ref);
            currentPresences = currentPresences.filter((m) => presenceRefsToRemove.indexOf(m.presence_ref) < 0);
            state[key] = currentPresences;
            onLeave(key, currentPresences, leftPresences);
            if (currentPresences.length === 0)
              delete state[key];
          });
          return state;
        }
        /** @internal */
        static map(obj, func) {
          return Object.getOwnPropertyNames(obj).map((key) => func(key, obj[key]));
        }
        /**
         * Remove 'metas' key
         * Change 'phx_ref' to 'presence_ref'
         * Remove 'phx_ref' and 'phx_ref_prev'
         *
         * @example
         * // returns {
         *  abc123: [
         *    { presence_ref: '2', user_id: 1 },
         *    { presence_ref: '3', user_id: 2 }
         *  ]
         * }
         * RealtimePresence.transformState({
         *  abc123: {
         *    metas: [
         *      { phx_ref: '2', phx_ref_prev: '1' user_id: 1 },
         *      { phx_ref: '3', user_id: 2 }
         *    ]
         *  }
         * })
         *
         * @internal
         */
        static transformState(state) {
          state = this.cloneDeep(state);
          return Object.getOwnPropertyNames(state).reduce((newState, key) => {
            const presences = state[key];
            if ("metas" in presences) {
              newState[key] = presences.metas.map((presence) => {
                presence["presence_ref"] = presence["phx_ref"];
                delete presence["phx_ref"];
                delete presence["phx_ref_prev"];
                return presence;
              });
            } else {
              newState[key] = presences;
            }
            return newState;
          }, {});
        }
        /** @internal */
        static cloneDeep(obj) {
          return JSON.parse(JSON.stringify(obj));
        }
        /** @internal */
        onJoin(callback) {
          this.caller.onJoin = callback;
        }
        /** @internal */
        onLeave(callback) {
          this.caller.onLeave = callback;
        }
        /** @internal */
        onSync(callback) {
          this.caller.onSync = callback;
        }
        /** @internal */
        inPendingSyncState() {
          return !this.joinRef || this.joinRef !== this.channel._joinRef();
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js
  var REALTIME_POSTGRES_CHANGES_LISTEN_EVENT, REALTIME_LISTEN_TYPES, REALTIME_SUBSCRIBE_STATES, REALTIME_CHANNEL_STATES, RealtimeChannel;
  var init_RealtimeChannel = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/RealtimeChannel.js"() {
      init_constants();
      init_push();
      init_timer();
      init_RealtimePresence();
      init_transformers();
      init_transformers();
      (function(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2) {
        REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["ALL"] = "*";
        REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["INSERT"] = "INSERT";
        REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["UPDATE"] = "UPDATE";
        REALTIME_POSTGRES_CHANGES_LISTEN_EVENT2["DELETE"] = "DELETE";
      })(REALTIME_POSTGRES_CHANGES_LISTEN_EVENT || (REALTIME_POSTGRES_CHANGES_LISTEN_EVENT = {}));
      (function(REALTIME_LISTEN_TYPES2) {
        REALTIME_LISTEN_TYPES2["BROADCAST"] = "broadcast";
        REALTIME_LISTEN_TYPES2["PRESENCE"] = "presence";
        REALTIME_LISTEN_TYPES2["POSTGRES_CHANGES"] = "postgres_changes";
        REALTIME_LISTEN_TYPES2["SYSTEM"] = "system";
      })(REALTIME_LISTEN_TYPES || (REALTIME_LISTEN_TYPES = {}));
      (function(REALTIME_SUBSCRIBE_STATES2) {
        REALTIME_SUBSCRIBE_STATES2["SUBSCRIBED"] = "SUBSCRIBED";
        REALTIME_SUBSCRIBE_STATES2["TIMED_OUT"] = "TIMED_OUT";
        REALTIME_SUBSCRIBE_STATES2["CLOSED"] = "CLOSED";
        REALTIME_SUBSCRIBE_STATES2["CHANNEL_ERROR"] = "CHANNEL_ERROR";
      })(REALTIME_SUBSCRIBE_STATES || (REALTIME_SUBSCRIBE_STATES = {}));
      REALTIME_CHANNEL_STATES = CHANNEL_STATES;
      RealtimeChannel = class _RealtimeChannel {
        constructor(topic, params = { config: {} }, socket) {
          this.topic = topic;
          this.params = params;
          this.socket = socket;
          this.bindings = {};
          this.state = CHANNEL_STATES.closed;
          this.joinedOnce = false;
          this.pushBuffer = [];
          this.subTopic = topic.replace(/^realtime:/i, "");
          this.params.config = Object.assign({
            broadcast: { ack: false, self: false },
            presence: { key: "" },
            private: false
          }, params.config);
          this.timeout = this.socket.timeout;
          this.joinPush = new Push(this, CHANNEL_EVENTS.join, this.params, this.timeout);
          this.rejoinTimer = new Timer(() => this._rejoinUntilConnected(), this.socket.reconnectAfterMs);
          this.joinPush.receive("ok", () => {
            this.state = CHANNEL_STATES.joined;
            this.rejoinTimer.reset();
            this.pushBuffer.forEach((pushEvent) => pushEvent.send());
            this.pushBuffer = [];
          });
          this._onClose(() => {
            this.rejoinTimer.reset();
            this.socket.log("channel", `close ${this.topic} ${this._joinRef()}`);
            this.state = CHANNEL_STATES.closed;
            this.socket._remove(this);
          });
          this._onError((reason) => {
            if (this._isLeaving() || this._isClosed()) {
              return;
            }
            this.socket.log("channel", `error ${this.topic}`, reason);
            this.state = CHANNEL_STATES.errored;
            this.rejoinTimer.scheduleTimeout();
          });
          this.joinPush.receive("timeout", () => {
            if (!this._isJoining()) {
              return;
            }
            this.socket.log("channel", `timeout ${this.topic}`, this.joinPush.timeout);
            this.state = CHANNEL_STATES.errored;
            this.rejoinTimer.scheduleTimeout();
          });
          this._on(CHANNEL_EVENTS.reply, {}, (payload, ref) => {
            this._trigger(this._replyEventName(ref), payload);
          });
          this.presence = new RealtimePresence(this);
          this.broadcastEndpointURL = httpEndpointURL(this.socket.endPoint) + "/api/broadcast";
          this.private = this.params.config.private || false;
        }
        /** Subscribe registers your client with the server */
        subscribe(callback, timeout = this.timeout) {
          var _a, _b;
          if (!this.socket.isConnected()) {
            this.socket.connect();
          }
          if (this.joinedOnce) {
            throw `tried to subscribe multiple times. 'subscribe' can only be called a single time per channel instance`;
          } else {
            const { config: { broadcast, presence, private: isPrivate } } = this.params;
            this._onError((e) => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, e));
            this._onClose(() => callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CLOSED));
            const accessTokenPayload = {};
            const config = {
              broadcast,
              presence,
              postgres_changes: (_b = (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.map((r) => r.filter)) !== null && _b !== void 0 ? _b : [],
              private: isPrivate
            };
            if (this.socket.accessTokenValue) {
              accessTokenPayload.access_token = this.socket.accessTokenValue;
            }
            this.updateJoinPayload(Object.assign({ config }, accessTokenPayload));
            this.joinedOnce = true;
            this._rejoin(timeout);
            this.joinPush.receive("ok", async ({ postgres_changes }) => {
              var _a2;
              this.socket.setAuth();
              if (postgres_changes === void 0) {
                callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
                return;
              } else {
                const clientPostgresBindings = this.bindings.postgres_changes;
                const bindingsLen = (_a2 = clientPostgresBindings === null || clientPostgresBindings === void 0 ? void 0 : clientPostgresBindings.length) !== null && _a2 !== void 0 ? _a2 : 0;
                const newPostgresBindings = [];
                for (let i = 0; i < bindingsLen; i++) {
                  const clientPostgresBinding = clientPostgresBindings[i];
                  const { filter: { event, schema, table, filter } } = clientPostgresBinding;
                  const serverPostgresFilter = postgres_changes && postgres_changes[i];
                  if (serverPostgresFilter && serverPostgresFilter.event === event && serverPostgresFilter.schema === schema && serverPostgresFilter.table === table && serverPostgresFilter.filter === filter) {
                    newPostgresBindings.push(Object.assign(Object.assign({}, clientPostgresBinding), { id: serverPostgresFilter.id }));
                  } else {
                    this.unsubscribe();
                    this.state = CHANNEL_STATES.errored;
                    callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error("mismatch between server and client bindings for postgres changes"));
                    return;
                  }
                }
                this.bindings.postgres_changes = newPostgresBindings;
                callback && callback(REALTIME_SUBSCRIBE_STATES.SUBSCRIBED);
                return;
              }
            }).receive("error", (error) => {
              this.state = CHANNEL_STATES.errored;
              callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.CHANNEL_ERROR, new Error(JSON.stringify(Object.values(error).join(", ") || "error")));
              return;
            }).receive("timeout", () => {
              callback === null || callback === void 0 ? void 0 : callback(REALTIME_SUBSCRIBE_STATES.TIMED_OUT);
              return;
            });
          }
          return this;
        }
        presenceState() {
          return this.presence.state;
        }
        async track(payload, opts = {}) {
          return await this.send({
            type: "presence",
            event: "track",
            payload
          }, opts.timeout || this.timeout);
        }
        async untrack(opts = {}) {
          return await this.send({
            type: "presence",
            event: "untrack"
          }, opts);
        }
        on(type, filter, callback) {
          return this._on(type, filter, callback);
        }
        /**
         * Sends a message into the channel.
         *
         * @param args Arguments to send to channel
         * @param args.type The type of event to send
         * @param args.event The name of the event being sent
         * @param args.payload Payload to be sent
         * @param opts Options to be used during the send process
         */
        async send(args, opts = {}) {
          var _a, _b;
          if (!this._canPush() && args.type === "broadcast") {
            const { event, payload: endpoint_payload } = args;
            const authorization = this.socket.accessTokenValue ? `Bearer ${this.socket.accessTokenValue}` : "";
            const options = {
              method: "POST",
              headers: {
                Authorization: authorization,
                apikey: this.socket.apiKey ? this.socket.apiKey : "",
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                messages: [
                  {
                    topic: this.subTopic,
                    event,
                    payload: endpoint_payload,
                    private: this.private
                  }
                ]
              })
            };
            try {
              const response = await this._fetchWithTimeout(this.broadcastEndpointURL, options, (_a = opts.timeout) !== null && _a !== void 0 ? _a : this.timeout);
              await ((_b = response.body) === null || _b === void 0 ? void 0 : _b.cancel());
              return response.ok ? "ok" : "error";
            } catch (error) {
              if (error.name === "AbortError") {
                return "timed out";
              } else {
                return "error";
              }
            }
          } else {
            return new Promise((resolve) => {
              var _a2, _b2, _c;
              const push = this._push(args.type, args, opts.timeout || this.timeout);
              if (args.type === "broadcast" && !((_c = (_b2 = (_a2 = this.params) === null || _a2 === void 0 ? void 0 : _a2.config) === null || _b2 === void 0 ? void 0 : _b2.broadcast) === null || _c === void 0 ? void 0 : _c.ack)) {
                resolve("ok");
              }
              push.receive("ok", () => resolve("ok"));
              push.receive("error", () => resolve("error"));
              push.receive("timeout", () => resolve("timed out"));
            });
          }
        }
        updateJoinPayload(payload) {
          this.joinPush.updatePayload(payload);
        }
        /**
         * Leaves the channel.
         *
         * Unsubscribes from server events, and instructs channel to terminate on server.
         * Triggers onClose() hooks.
         *
         * To receive leave acknowledgements, use the a `receive` hook to bind to the server ack, ie:
         * channel.unsubscribe().receive("ok", () => alert("left!") )
         */
        unsubscribe(timeout = this.timeout) {
          this.state = CHANNEL_STATES.leaving;
          const onClose = () => {
            this.socket.log("channel", `leave ${this.topic}`);
            this._trigger(CHANNEL_EVENTS.close, "leave", this._joinRef());
          };
          this.joinPush.destroy();
          return new Promise((resolve) => {
            const leavePush = new Push(this, CHANNEL_EVENTS.leave, {}, timeout);
            leavePush.receive("ok", () => {
              onClose();
              resolve("ok");
            }).receive("timeout", () => {
              onClose();
              resolve("timed out");
            }).receive("error", () => {
              resolve("error");
            });
            leavePush.send();
            if (!this._canPush()) {
              leavePush.trigger("ok", {});
            }
          });
        }
        /**
         * Teardown the channel.
         *
         * Destroys and stops related timers.
         */
        teardown() {
          this.pushBuffer.forEach((push) => push.destroy());
          this.rejoinTimer && clearTimeout(this.rejoinTimer.timer);
          this.joinPush.destroy();
        }
        /** @internal */
        async _fetchWithTimeout(url, options, timeout) {
          const controller = new AbortController();
          const id = setTimeout(() => controller.abort(), timeout);
          const response = await this.socket.fetch(url, Object.assign(Object.assign({}, options), { signal: controller.signal }));
          clearTimeout(id);
          return response;
        }
        /** @internal */
        _push(event, payload, timeout = this.timeout) {
          if (!this.joinedOnce) {
            throw `tried to push '${event}' to '${this.topic}' before joining. Use channel.subscribe() before pushing events`;
          }
          let pushEvent = new Push(this, event, payload, timeout);
          if (this._canPush()) {
            pushEvent.send();
          } else {
            pushEvent.startTimeout();
            this.pushBuffer.push(pushEvent);
          }
          return pushEvent;
        }
        /**
         * Overridable message hook
         *
         * Receives all events for specialized message handling before dispatching to the channel callbacks.
         * Must return the payload, modified or unmodified.
         *
         * @internal
         */
        _onMessage(_event, payload, _ref) {
          return payload;
        }
        /** @internal */
        _isMember(topic) {
          return this.topic === topic;
        }
        /** @internal */
        _joinRef() {
          return this.joinPush.ref;
        }
        /** @internal */
        _trigger(type, payload, ref) {
          var _a, _b;
          const typeLower = type.toLocaleLowerCase();
          const { close, error, leave, join } = CHANNEL_EVENTS;
          const events = [close, error, leave, join];
          if (ref && events.indexOf(typeLower) >= 0 && ref !== this._joinRef()) {
            return;
          }
          let handledPayload = this._onMessage(typeLower, payload, ref);
          if (payload && !handledPayload) {
            throw "channel onMessage callbacks must return the payload, modified or unmodified";
          }
          if (["insert", "update", "delete"].includes(typeLower)) {
            (_a = this.bindings.postgres_changes) === null || _a === void 0 ? void 0 : _a.filter((bind) => {
              var _a2, _b2, _c;
              return ((_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event) === "*" || ((_c = (_b2 = bind.filter) === null || _b2 === void 0 ? void 0 : _b2.event) === null || _c === void 0 ? void 0 : _c.toLocaleLowerCase()) === typeLower;
            }).map((bind) => bind.callback(handledPayload, ref));
          } else {
            (_b = this.bindings[typeLower]) === null || _b === void 0 ? void 0 : _b.filter((bind) => {
              var _a2, _b2, _c, _d, _e, _f;
              if (["broadcast", "presence", "postgres_changes"].includes(typeLower)) {
                if ("id" in bind) {
                  const bindId = bind.id;
                  const bindEvent = (_a2 = bind.filter) === null || _a2 === void 0 ? void 0 : _a2.event;
                  return bindId && ((_b2 = payload.ids) === null || _b2 === void 0 ? void 0 : _b2.includes(bindId)) && (bindEvent === "*" || (bindEvent === null || bindEvent === void 0 ? void 0 : bindEvent.toLocaleLowerCase()) === ((_c = payload.data) === null || _c === void 0 ? void 0 : _c.type.toLocaleLowerCase()));
                } else {
                  const bindEvent = (_e = (_d = bind === null || bind === void 0 ? void 0 : bind.filter) === null || _d === void 0 ? void 0 : _d.event) === null || _e === void 0 ? void 0 : _e.toLocaleLowerCase();
                  return bindEvent === "*" || bindEvent === ((_f = payload === null || payload === void 0 ? void 0 : payload.event) === null || _f === void 0 ? void 0 : _f.toLocaleLowerCase());
                }
              } else {
                return bind.type.toLocaleLowerCase() === typeLower;
              }
            }).map((bind) => {
              if (typeof handledPayload === "object" && "ids" in handledPayload) {
                const postgresChanges = handledPayload.data;
                const { schema, table, commit_timestamp, type: type2, errors } = postgresChanges;
                const enrichedPayload = {
                  schema,
                  table,
                  commit_timestamp,
                  eventType: type2,
                  new: {},
                  old: {},
                  errors
                };
                handledPayload = Object.assign(Object.assign({}, enrichedPayload), this._getPayloadRecords(postgresChanges));
              }
              bind.callback(handledPayload, ref);
            });
          }
        }
        /** @internal */
        _isClosed() {
          return this.state === CHANNEL_STATES.closed;
        }
        /** @internal */
        _isJoined() {
          return this.state === CHANNEL_STATES.joined;
        }
        /** @internal */
        _isJoining() {
          return this.state === CHANNEL_STATES.joining;
        }
        /** @internal */
        _isLeaving() {
          return this.state === CHANNEL_STATES.leaving;
        }
        /** @internal */
        _replyEventName(ref) {
          return `chan_reply_${ref}`;
        }
        /** @internal */
        _on(type, filter, callback) {
          const typeLower = type.toLocaleLowerCase();
          const binding = {
            type: typeLower,
            filter,
            callback
          };
          if (this.bindings[typeLower]) {
            this.bindings[typeLower].push(binding);
          } else {
            this.bindings[typeLower] = [binding];
          }
          return this;
        }
        /** @internal */
        _off(type, filter) {
          const typeLower = type.toLocaleLowerCase();
          this.bindings[typeLower] = this.bindings[typeLower].filter((bind) => {
            var _a;
            return !(((_a = bind.type) === null || _a === void 0 ? void 0 : _a.toLocaleLowerCase()) === typeLower && _RealtimeChannel.isEqual(bind.filter, filter));
          });
          return this;
        }
        /** @internal */
        static isEqual(obj1, obj2) {
          if (Object.keys(obj1).length !== Object.keys(obj2).length) {
            return false;
          }
          for (const k in obj1) {
            if (obj1[k] !== obj2[k]) {
              return false;
            }
          }
          return true;
        }
        /** @internal */
        _rejoinUntilConnected() {
          this.rejoinTimer.scheduleTimeout();
          if (this.socket.isConnected()) {
            this._rejoin();
          }
        }
        /**
         * Registers a callback that will be executed when the channel closes.
         *
         * @internal
         */
        _onClose(callback) {
          this._on(CHANNEL_EVENTS.close, {}, callback);
        }
        /**
         * Registers a callback that will be executed when the channel encounteres an error.
         *
         * @internal
         */
        _onError(callback) {
          this._on(CHANNEL_EVENTS.error, {}, (reason) => callback(reason));
        }
        /**
         * Returns `true` if the socket is connected and the channel has been joined.
         *
         * @internal
         */
        _canPush() {
          return this.socket.isConnected() && this._isJoined();
        }
        /** @internal */
        _rejoin(timeout = this.timeout) {
          if (this._isLeaving()) {
            return;
          }
          this.socket._leaveOpenTopic(this.topic);
          this.state = CHANNEL_STATES.joining;
          this.joinPush.resend(timeout);
        }
        /** @internal */
        _getPayloadRecords(payload) {
          const records = {
            new: {},
            old: {}
          };
          if (payload.type === "INSERT" || payload.type === "UPDATE") {
            records.new = convertChangeData(payload.columns, payload.record);
          }
          if (payload.type === "UPDATE" || payload.type === "DELETE") {
            records.old = convertChangeData(payload.columns, payload.old_record);
          }
          return records;
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js
  var noop2, WORKER_SCRIPT, RealtimeClient, WSWebSocketDummy;
  var init_RealtimeClient = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/RealtimeClient.js"() {
      init_WebSocket();
      init_constants();
      init_serializer();
      init_timer();
      init_transformers();
      init_RealtimeChannel();
      noop2 = () => {
      };
      WORKER_SCRIPT = `
  addEventListener("message", (e) => {
    if (e.data.event === "start") {
      setInterval(() => postMessage({ event: "keepAlive" }), e.data.interval);
    }
  });`;
      RealtimeClient = class {
        /**
         * Initializes the Socket.
         *
         * @param endPoint The string WebSocket endpoint, ie, "ws://example.com/socket", "wss://example.com", "/socket" (inherited host & protocol)
         * @param httpEndpoint The string HTTP endpoint, ie, "https://example.com", "/" (inherited host & protocol)
         * @param options.transport The Websocket Transport, for example WebSocket. This can be a custom implementation
         * @param options.timeout The default timeout in milliseconds to trigger push timeouts.
         * @param options.params The optional params to pass when connecting.
         * @param options.headers The optional headers to pass when connecting.
         * @param options.heartbeatIntervalMs The millisec interval to send a heartbeat message.
         * @param options.logger The optional function for specialized logging, ie: logger: (kind, msg, data) => { console.log(`${kind}: ${msg}`, data) }
         * @param options.logLevel Sets the log level for Realtime
         * @param options.encode The function to encode outgoing messages. Defaults to JSON: (payload, callback) => callback(JSON.stringify(payload))
         * @param options.decode The function to decode incoming messages. Defaults to Serializer's decode.
         * @param options.reconnectAfterMs he optional function that returns the millsec reconnect interval. Defaults to stepped backoff off.
         * @param options.worker Use Web Worker to set a side flow. Defaults to false.
         * @param options.workerUrl The URL of the worker script. Defaults to https://realtime.supabase.com/worker.js that includes a heartbeat event call to keep the connection alive.
         */
        constructor(endPoint, options) {
          var _a;
          this.accessTokenValue = null;
          this.apiKey = null;
          this.channels = new Array();
          this.endPoint = "";
          this.httpEndpoint = "";
          this.headers = DEFAULT_HEADERS;
          this.params = {};
          this.timeout = DEFAULT_TIMEOUT;
          this.heartbeatIntervalMs = 25e3;
          this.heartbeatTimer = void 0;
          this.pendingHeartbeatRef = null;
          this.heartbeatCallback = noop2;
          this.ref = 0;
          this.logger = noop2;
          this.conn = null;
          this.sendBuffer = [];
          this.serializer = new Serializer();
          this.stateChangeCallbacks = {
            open: [],
            close: [],
            error: [],
            message: []
          };
          this.accessToken = null;
          this._resolveFetch = (customFetch) => {
            let _fetch;
            if (customFetch) {
              _fetch = customFetch;
            } else if (typeof fetch === "undefined") {
              _fetch = (...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args));
            } else {
              _fetch = fetch;
            }
            return (...args) => _fetch(...args);
          };
          this.endPoint = `${endPoint}/${TRANSPORTS.websocket}`;
          this.httpEndpoint = httpEndpointURL(endPoint);
          if (options === null || options === void 0 ? void 0 : options.transport) {
            this.transport = options.transport;
          } else {
            this.transport = null;
          }
          if (options === null || options === void 0 ? void 0 : options.params)
            this.params = options.params;
          if (options === null || options === void 0 ? void 0 : options.headers)
            this.headers = Object.assign(Object.assign({}, this.headers), options.headers);
          if (options === null || options === void 0 ? void 0 : options.timeout)
            this.timeout = options.timeout;
          if (options === null || options === void 0 ? void 0 : options.logger)
            this.logger = options.logger;
          if ((options === null || options === void 0 ? void 0 : options.logLevel) || (options === null || options === void 0 ? void 0 : options.log_level)) {
            this.logLevel = options.logLevel || options.log_level;
            this.params = Object.assign(Object.assign({}, this.params), { log_level: this.logLevel });
          }
          if (options === null || options === void 0 ? void 0 : options.heartbeatIntervalMs)
            this.heartbeatIntervalMs = options.heartbeatIntervalMs;
          const accessTokenValue = (_a = options === null || options === void 0 ? void 0 : options.params) === null || _a === void 0 ? void 0 : _a.apikey;
          if (accessTokenValue) {
            this.accessTokenValue = accessTokenValue;
            this.apiKey = accessTokenValue;
          }
          this.reconnectAfterMs = (options === null || options === void 0 ? void 0 : options.reconnectAfterMs) ? options.reconnectAfterMs : (tries) => {
            return [1e3, 2e3, 5e3, 1e4][tries - 1] || 1e4;
          };
          this.encode = (options === null || options === void 0 ? void 0 : options.encode) ? options.encode : (payload, callback) => {
            return callback(JSON.stringify(payload));
          };
          this.decode = (options === null || options === void 0 ? void 0 : options.decode) ? options.decode : this.serializer.decode.bind(this.serializer);
          this.reconnectTimer = new Timer(async () => {
            this.disconnect();
            this.connect();
          }, this.reconnectAfterMs);
          this.fetch = this._resolveFetch(options === null || options === void 0 ? void 0 : options.fetch);
          if (options === null || options === void 0 ? void 0 : options.worker) {
            if (typeof window !== "undefined" && !window.Worker) {
              throw new Error("Web Worker is not supported");
            }
            this.worker = (options === null || options === void 0 ? void 0 : options.worker) || false;
            this.workerUrl = options === null || options === void 0 ? void 0 : options.workerUrl;
          }
          this.accessToken = (options === null || options === void 0 ? void 0 : options.accessToken) || null;
        }
        /**
         * Connects the socket, unless already connected.
         */
        connect() {
          if (this.conn) {
            return;
          }
          if (!this.transport) {
            this.transport = WebSocket_default;
          }
          if (this.transport) {
            const isBrowser2 = typeof window !== "undefined" && this.transport === window.WebSocket;
            if (isBrowser2) {
              this.conn = new this.transport(this.endpointURL());
            } else {
              this.conn = new this.transport(this.endpointURL(), void 0, {
                headers: this.headers
              });
            }
            this.setupConnection();
            return;
          }
          this.conn = new WSWebSocketDummy(this.endpointURL(), void 0, {
            close: () => {
              this.conn = null;
            }
          });
        }
        /**
         * Returns the URL of the websocket.
         * @returns string The URL of the websocket.
         */
        endpointURL() {
          return this._appendParams(this.endPoint, Object.assign({}, this.params, { vsn: VSN }));
        }
        /**
         * Disconnects the socket.
         *
         * @param code A numeric status code to send on disconnect.
         * @param reason A custom reason for the disconnect.
         */
        disconnect(code, reason) {
          if (this.conn) {
            this.conn.onclose = function() {
            };
            if (code) {
              this.conn.close(code, reason !== null && reason !== void 0 ? reason : "");
            } else {
              this.conn.close();
            }
            this.conn = null;
            this.heartbeatTimer && clearInterval(this.heartbeatTimer);
            this.reconnectTimer.reset();
            this.channels.forEach((channel) => channel.teardown());
          }
        }
        /**
         * Returns all created channels
         */
        getChannels() {
          return this.channels;
        }
        /**
         * Unsubscribes and removes a single channel
         * @param channel A RealtimeChannel instance
         */
        async removeChannel(channel) {
          const status = await channel.unsubscribe();
          this.channels = this.channels.filter((c) => c._joinRef !== channel._joinRef);
          if (this.channels.length === 0) {
            this.disconnect();
          }
          return status;
        }
        /**
         * Unsubscribes and removes all channels
         */
        async removeAllChannels() {
          const values_1 = await Promise.all(this.channels.map((channel) => channel.unsubscribe()));
          this.channels = [];
          this.disconnect();
          return values_1;
        }
        /**
         * Logs the message.
         *
         * For customized logging, `this.logger` can be overridden.
         */
        log(kind, msg, data) {
          this.logger(kind, msg, data);
        }
        /**
         * Returns the current state of the socket.
         */
        connectionState() {
          switch (this.conn && this.conn.readyState) {
            case SOCKET_STATES.connecting:
              return CONNECTION_STATE.Connecting;
            case SOCKET_STATES.open:
              return CONNECTION_STATE.Open;
            case SOCKET_STATES.closing:
              return CONNECTION_STATE.Closing;
            default:
              return CONNECTION_STATE.Closed;
          }
        }
        /**
         * Returns `true` is the connection is open.
         */
        isConnected() {
          return this.connectionState() === CONNECTION_STATE.Open;
        }
        channel(topic, params = { config: {} }) {
          const realtimeTopic = `realtime:${topic}`;
          const exists = this.getChannels().find((c) => c.topic === realtimeTopic);
          if (!exists) {
            const chan = new RealtimeChannel(`realtime:${topic}`, params, this);
            this.channels.push(chan);
            return chan;
          } else {
            return exists;
          }
        }
        /**
         * Push out a message if the socket is connected.
         *
         * If the socket is not connected, the message gets enqueued within a local buffer, and sent out when a connection is next established.
         */
        push(data) {
          const { topic, event, payload, ref } = data;
          const callback = () => {
            this.encode(data, (result) => {
              var _a;
              (_a = this.conn) === null || _a === void 0 ? void 0 : _a.send(result);
            });
          };
          this.log("push", `${topic} ${event} (${ref})`, payload);
          if (this.isConnected()) {
            callback();
          } else {
            this.sendBuffer.push(callback);
          }
        }
        /**
         * Sets the JWT access token used for channel subscription authorization and Realtime RLS.
         *
         * If param is null it will use the `accessToken` callback function or the token set on the client.
         *
         * On callback used, it will set the value of the token internal to the client.
         *
         * @param token A JWT string to override the token set on the client.
         */
        async setAuth(token = null) {
          let tokenToSend = token || this.accessToken && await this.accessToken() || this.accessTokenValue;
          if (this.accessTokenValue != tokenToSend) {
            this.accessTokenValue = tokenToSend;
            this.channels.forEach((channel) => {
              tokenToSend && channel.updateJoinPayload({
                access_token: tokenToSend,
                version: this.headers && this.headers["X-Client-Info"]
              });
              if (channel.joinedOnce && channel._isJoined()) {
                channel._push(CHANNEL_EVENTS.access_token, {
                  access_token: tokenToSend
                });
              }
            });
          }
        }
        /**
         * Sends a heartbeat message if the socket is connected.
         */
        async sendHeartbeat() {
          var _a;
          if (!this.isConnected()) {
            this.heartbeatCallback("disconnected");
            return;
          }
          if (this.pendingHeartbeatRef) {
            this.pendingHeartbeatRef = null;
            this.log("transport", "heartbeat timeout. Attempting to re-establish connection");
            this.heartbeatCallback("timeout");
            (_a = this.conn) === null || _a === void 0 ? void 0 : _a.close(WS_CLOSE_NORMAL, "hearbeat timeout");
            return;
          }
          this.pendingHeartbeatRef = this._makeRef();
          this.push({
            topic: "phoenix",
            event: "heartbeat",
            payload: {},
            ref: this.pendingHeartbeatRef
          });
          this.heartbeatCallback("sent");
          await this.setAuth();
        }
        onHeartbeat(callback) {
          this.heartbeatCallback = callback;
        }
        /**
         * Flushes send buffer
         */
        flushSendBuffer() {
          if (this.isConnected() && this.sendBuffer.length > 0) {
            this.sendBuffer.forEach((callback) => callback());
            this.sendBuffer = [];
          }
        }
        /**
         * Return the next message ref, accounting for overflows
         *
         * @internal
         */
        _makeRef() {
          let newRef = this.ref + 1;
          if (newRef === this.ref) {
            this.ref = 0;
          } else {
            this.ref = newRef;
          }
          return this.ref.toString();
        }
        /**
         * Unsubscribe from channels with the specified topic.
         *
         * @internal
         */
        _leaveOpenTopic(topic) {
          let dupChannel = this.channels.find((c) => c.topic === topic && (c._isJoined() || c._isJoining()));
          if (dupChannel) {
            this.log("transport", `leaving duplicate topic "${topic}"`);
            dupChannel.unsubscribe();
          }
        }
        /**
         * Removes a subscription from the socket.
         *
         * @param channel An open subscription.
         *
         * @internal
         */
        _remove(channel) {
          this.channels = this.channels.filter((c) => c.topic !== channel.topic);
        }
        /**
         * Sets up connection handlers.
         *
         * @internal
         */
        setupConnection() {
          if (this.conn) {
            this.conn.binaryType = "arraybuffer";
            this.conn.onopen = () => this._onConnOpen();
            this.conn.onerror = (error) => this._onConnError(error);
            this.conn.onmessage = (event) => this._onConnMessage(event);
            this.conn.onclose = (event) => this._onConnClose(event);
          }
        }
        /** @internal */
        _onConnMessage(rawMessage) {
          this.decode(rawMessage.data, (msg) => {
            let { topic, event, payload, ref } = msg;
            if (topic === "phoenix" && event === "phx_reply") {
              this.heartbeatCallback(msg.payload.status == "ok" ? "ok" : "error");
            }
            if (ref && ref === this.pendingHeartbeatRef) {
              this.pendingHeartbeatRef = null;
            }
            this.log("receive", `${payload.status || ""} ${topic} ${event} ${ref && "(" + ref + ")" || ""}`, payload);
            Array.from(this.channels).filter((channel) => channel._isMember(topic)).forEach((channel) => channel._trigger(event, payload, ref));
            this.stateChangeCallbacks.message.forEach((callback) => callback(msg));
          });
        }
        /** @internal */
        _onConnOpen() {
          this.log("transport", `connected to ${this.endpointURL()}`);
          this.flushSendBuffer();
          this.reconnectTimer.reset();
          if (!this.worker) {
            this.heartbeatTimer && clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), this.heartbeatIntervalMs);
          } else {
            if (this.workerUrl) {
              this.log("worker", `starting worker for from ${this.workerUrl}`);
            } else {
              this.log("worker", `starting default worker`);
            }
            const objectUrl = this._workerObjectUrl(this.workerUrl);
            this.workerRef = new Worker(objectUrl);
            this.workerRef.onerror = (error) => {
              this.log("worker", "worker error", error.message);
              this.workerRef.terminate();
            };
            this.workerRef.onmessage = (event) => {
              if (event.data.event === "keepAlive") {
                this.sendHeartbeat();
              }
            };
            this.workerRef.postMessage({
              event: "start",
              interval: this.heartbeatIntervalMs
            });
          }
          this.stateChangeCallbacks.open.forEach((callback) => callback());
        }
        /** @internal */
        _onConnClose(event) {
          this.log("transport", "close", event);
          this._triggerChanError();
          this.heartbeatTimer && clearInterval(this.heartbeatTimer);
          this.reconnectTimer.scheduleTimeout();
          this.stateChangeCallbacks.close.forEach((callback) => callback(event));
        }
        /** @internal */
        _onConnError(error) {
          this.log("transport", error.message);
          this._triggerChanError();
          this.stateChangeCallbacks.error.forEach((callback) => callback(error));
        }
        /** @internal */
        _triggerChanError() {
          this.channels.forEach((channel) => channel._trigger(CHANNEL_EVENTS.error));
        }
        /** @internal */
        _appendParams(url, params) {
          if (Object.keys(params).length === 0) {
            return url;
          }
          const prefix = url.match(/\?/) ? "&" : "?";
          const query = new URLSearchParams(params);
          return `${url}${prefix}${query}`;
        }
        _workerObjectUrl(url) {
          let result_url;
          if (url) {
            result_url = url;
          } else {
            const blob = new Blob([WORKER_SCRIPT], { type: "application/javascript" });
            result_url = URL.createObjectURL(blob);
          }
          return result_url;
        }
      };
      WSWebSocketDummy = class {
        constructor(address, _protocols, options) {
          this.binaryType = "arraybuffer";
          this.onclose = () => {
          };
          this.onerror = () => {
          };
          this.onmessage = () => {
          };
          this.onopen = () => {
          };
          this.readyState = SOCKET_STATES.connecting;
          this.send = () => {
          };
          this.url = null;
          this.url = address;
          this.close = options.close;
        }
      };
    }
  });

  // project/node_modules/@supabase/realtime-js/dist/module/index.js
  var init_module2 = __esm({
    "project/node_modules/@supabase/realtime-js/dist/module/index.js"() {
      init_RealtimeClient();
      init_RealtimeChannel();
      init_RealtimePresence();
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/errors.js
  function isStorageError(error) {
    return typeof error === "object" && error !== null && "__isStorageError" in error;
  }
  var StorageError, StorageApiError, StorageUnknownError;
  var init_errors = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/errors.js"() {
      StorageError = class extends Error {
        constructor(message) {
          super(message);
          this.__isStorageError = true;
          this.name = "StorageError";
        }
      };
      StorageApiError = class extends StorageError {
        constructor(message, status) {
          super(message);
          this.name = "StorageApiError";
          this.status = status;
        }
        toJSON() {
          return {
            name: this.name,
            message: this.message,
            status: this.status
          };
        }
      };
      StorageUnknownError = class extends StorageError {
        constructor(message, originalError) {
          super(message);
          this.name = "StorageUnknownError";
          this.originalError = originalError;
        }
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/helpers.js
  var __awaiter2, resolveFetch2, resolveResponse, recursiveToCamel;
  var init_helpers = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/helpers.js"() {
      __awaiter2 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      resolveFetch2 = (customFetch) => {
        let _fetch;
        if (customFetch) {
          _fetch = customFetch;
        } else if (typeof fetch === "undefined") {
          _fetch = (...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args));
        } else {
          _fetch = fetch;
        }
        return (...args) => _fetch(...args);
      };
      resolveResponse = () => __awaiter2(void 0, void 0, void 0, function* () {
        if (typeof Response === "undefined") {
          return (yield Promise.resolve().then(() => (init_browser(), browser_exports))).Response;
        }
        return Response;
      });
      recursiveToCamel = (item) => {
        if (Array.isArray(item)) {
          return item.map((el) => recursiveToCamel(el));
        } else if (typeof item === "function" || item !== Object(item)) {
          return item;
        }
        const result = {};
        Object.entries(item).forEach(([key, value]) => {
          const newKey = key.replace(/([-_][a-z])/gi, (c) => c.toUpperCase().replace(/[-_]/g, ""));
          result[newKey] = recursiveToCamel(value);
        });
        return result;
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/fetch.js
  function _handleRequest(fetcher, method, url, options, parameters, body) {
    return __awaiter3(this, void 0, void 0, function* () {
      return new Promise((resolve, reject) => {
        fetcher(url, _getRequestParams(method, options, parameters, body)).then((result) => {
          if (!result.ok)
            throw result;
          if (options === null || options === void 0 ? void 0 : options.noResolveJson)
            return result;
          return result.json();
        }).then((data) => resolve(data)).catch((error) => handleError(error, reject, options));
      });
    });
  }
  function get(fetcher, url, options, parameters) {
    return __awaiter3(this, void 0, void 0, function* () {
      return _handleRequest(fetcher, "GET", url, options, parameters);
    });
  }
  function post(fetcher, url, body, options, parameters) {
    return __awaiter3(this, void 0, void 0, function* () {
      return _handleRequest(fetcher, "POST", url, options, parameters, body);
    });
  }
  function put(fetcher, url, body, options, parameters) {
    return __awaiter3(this, void 0, void 0, function* () {
      return _handleRequest(fetcher, "PUT", url, options, parameters, body);
    });
  }
  function head(fetcher, url, options, parameters) {
    return __awaiter3(this, void 0, void 0, function* () {
      return _handleRequest(fetcher, "HEAD", url, Object.assign(Object.assign({}, options), { noResolveJson: true }), parameters);
    });
  }
  function remove(fetcher, url, body, options, parameters) {
    return __awaiter3(this, void 0, void 0, function* () {
      return _handleRequest(fetcher, "DELETE", url, options, parameters, body);
    });
  }
  var __awaiter3, _getErrorMessage, handleError, _getRequestParams;
  var init_fetch = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/fetch.js"() {
      init_errors();
      init_helpers();
      __awaiter3 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      _getErrorMessage = (err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err);
      handleError = (error, reject, options) => __awaiter3(void 0, void 0, void 0, function* () {
        const Res = yield resolveResponse();
        if (error instanceof Res && !(options === null || options === void 0 ? void 0 : options.noResolveJson)) {
          error.json().then((err) => {
            reject(new StorageApiError(_getErrorMessage(err), error.status || 500));
          }).catch((err) => {
            reject(new StorageUnknownError(_getErrorMessage(err), err));
          });
        } else {
          reject(new StorageUnknownError(_getErrorMessage(error), error));
        }
      });
      _getRequestParams = (method, options, parameters, body) => {
        const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
        if (method === "GET") {
          return params;
        }
        params.headers = Object.assign({ "Content-Type": "application/json" }, options === null || options === void 0 ? void 0 : options.headers);
        if (body) {
          params.body = JSON.stringify(body);
        }
        return Object.assign(Object.assign({}, params), parameters);
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js
  var __awaiter4, DEFAULT_SEARCH_OPTIONS, DEFAULT_FILE_OPTIONS, StorageFileApi;
  var init_StorageFileApi = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/packages/StorageFileApi.js"() {
      init_errors();
      init_fetch();
      init_helpers();
      __awaiter4 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      DEFAULT_SEARCH_OPTIONS = {
        limit: 100,
        offset: 0,
        sortBy: {
          column: "name",
          order: "asc"
        }
      };
      DEFAULT_FILE_OPTIONS = {
        cacheControl: "3600",
        contentType: "text/plain;charset=UTF-8",
        upsert: false
      };
      StorageFileApi = class {
        constructor(url, headers = {}, bucketId, fetch3) {
          this.url = url;
          this.headers = headers;
          this.bucketId = bucketId;
          this.fetch = resolveFetch2(fetch3);
        }
        /**
         * Uploads a file to an existing bucket or replaces an existing file at the specified path with a new one.
         *
         * @param method HTTP method.
         * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
         * @param fileBody The body of the file to be stored in the bucket.
         */
        uploadOrUpdate(method, path, fileBody, fileOptions) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              let body;
              const options = Object.assign(Object.assign({}, DEFAULT_FILE_OPTIONS), fileOptions);
              let headers = Object.assign(Object.assign({}, this.headers), method === "POST" && { "x-upsert": String(options.upsert) });
              const metadata = options.metadata;
              if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
                body = new FormData();
                body.append("cacheControl", options.cacheControl);
                if (metadata) {
                  body.append("metadata", this.encodeMetadata(metadata));
                }
                body.append("", fileBody);
              } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
                body = fileBody;
                body.append("cacheControl", options.cacheControl);
                if (metadata) {
                  body.append("metadata", this.encodeMetadata(metadata));
                }
              } else {
                body = fileBody;
                headers["cache-control"] = `max-age=${options.cacheControl}`;
                headers["content-type"] = options.contentType;
                if (metadata) {
                  headers["x-metadata"] = this.toBase64(this.encodeMetadata(metadata));
                }
              }
              if (fileOptions === null || fileOptions === void 0 ? void 0 : fileOptions.headers) {
                headers = Object.assign(Object.assign({}, headers), fileOptions.headers);
              }
              const cleanPath = this._removeEmptyFolders(path);
              const _path = this._getFinalPath(cleanPath);
              const res = yield this.fetch(`${this.url}/object/${_path}`, Object.assign({ method, body, headers }, (options === null || options === void 0 ? void 0 : options.duplex) ? { duplex: options.duplex } : {}));
              const data = yield res.json();
              if (res.ok) {
                return {
                  data: { path: cleanPath, id: data.Id, fullPath: data.Key },
                  error: null
                };
              } else {
                const error = data;
                return { data: null, error };
              }
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Uploads a file to an existing bucket.
         *
         * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
         * @param fileBody The body of the file to be stored in the bucket.
         */
        upload(path, fileBody, fileOptions) {
          return __awaiter4(this, void 0, void 0, function* () {
            return this.uploadOrUpdate("POST", path, fileBody, fileOptions);
          });
        }
        /**
         * Upload a file with a token generated from `createSignedUploadUrl`.
         * @param path The file path, including the file name. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to upload.
         * @param token The token generated from `createSignedUploadUrl`
         * @param fileBody The body of the file to be stored in the bucket.
         */
        uploadToSignedUrl(path, token, fileBody, fileOptions) {
          return __awaiter4(this, void 0, void 0, function* () {
            const cleanPath = this._removeEmptyFolders(path);
            const _path = this._getFinalPath(cleanPath);
            const url = new URL(this.url + `/object/upload/sign/${_path}`);
            url.searchParams.set("token", token);
            try {
              let body;
              const options = Object.assign({ upsert: DEFAULT_FILE_OPTIONS.upsert }, fileOptions);
              const headers = Object.assign(Object.assign({}, this.headers), { "x-upsert": String(options.upsert) });
              if (typeof Blob !== "undefined" && fileBody instanceof Blob) {
                body = new FormData();
                body.append("cacheControl", options.cacheControl);
                body.append("", fileBody);
              } else if (typeof FormData !== "undefined" && fileBody instanceof FormData) {
                body = fileBody;
                body.append("cacheControl", options.cacheControl);
              } else {
                body = fileBody;
                headers["cache-control"] = `max-age=${options.cacheControl}`;
                headers["content-type"] = options.contentType;
              }
              const res = yield this.fetch(url.toString(), {
                method: "PUT",
                body,
                headers
              });
              const data = yield res.json();
              if (res.ok) {
                return {
                  data: { path: cleanPath, fullPath: data.Key },
                  error: null
                };
              } else {
                const error = data;
                return { data: null, error };
              }
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Creates a signed upload URL.
         * Signed upload URLs can be used to upload files to the bucket without further authentication.
         * They are valid for 2 hours.
         * @param path The file path, including the current file name. For example `folder/image.png`.
         * @param options.upsert If set to true, allows the file to be overwritten if it already exists.
         */
        createSignedUploadUrl(path, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              let _path = this._getFinalPath(path);
              const headers = Object.assign({}, this.headers);
              if (options === null || options === void 0 ? void 0 : options.upsert) {
                headers["x-upsert"] = "true";
              }
              const data = yield post(this.fetch, `${this.url}/object/upload/sign/${_path}`, {}, { headers });
              const url = new URL(this.url + data.url);
              const token = url.searchParams.get("token");
              if (!token) {
                throw new StorageError("No token returned by API");
              }
              return { data: { signedUrl: url.toString(), path, token }, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Replaces an existing file at the specified path with a new one.
         *
         * @param path The relative file path. Should be of the format `folder/subfolder/filename.png`. The bucket must already exist before attempting to update.
         * @param fileBody The body of the file to be stored in the bucket.
         */
        update(path, fileBody, fileOptions) {
          return __awaiter4(this, void 0, void 0, function* () {
            return this.uploadOrUpdate("PUT", path, fileBody, fileOptions);
          });
        }
        /**
         * Moves an existing file to a new path in the same bucket.
         *
         * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
         * @param toPath The new file path, including the new file name. For example `folder/image-new.png`.
         * @param options The destination options.
         */
        move(fromPath, toPath, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              const data = yield post(this.fetch, `${this.url}/object/move`, {
                bucketId: this.bucketId,
                sourceKey: fromPath,
                destinationKey: toPath,
                destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
              }, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Copies an existing file to a new path in the same bucket.
         *
         * @param fromPath The original file path, including the current file name. For example `folder/image.png`.
         * @param toPath The new file path, including the new file name. For example `folder/image-copy.png`.
         * @param options The destination options.
         */
        copy(fromPath, toPath, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              const data = yield post(this.fetch, `${this.url}/object/copy`, {
                bucketId: this.bucketId,
                sourceKey: fromPath,
                destinationKey: toPath,
                destinationBucket: options === null || options === void 0 ? void 0 : options.destinationBucket
              }, { headers: this.headers });
              return { data: { path: data.Key }, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Creates a signed URL. Use a signed URL to share a file for a fixed amount of time.
         *
         * @param path The file path, including the current file name. For example `folder/image.png`.
         * @param expiresIn The number of seconds until the signed URL expires. For example, `60` for a URL which is valid for one minute.
         * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
         * @param options.transform Transform the asset before serving it to the client.
         */
        createSignedUrl(path, expiresIn, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              let _path = this._getFinalPath(path);
              let data = yield post(this.fetch, `${this.url}/object/sign/${_path}`, Object.assign({ expiresIn }, (options === null || options === void 0 ? void 0 : options.transform) ? { transform: options.transform } : {}), { headers: this.headers });
              const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
              const signedUrl = encodeURI(`${this.url}${data.signedURL}${downloadQueryParam}`);
              data = { signedUrl };
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Creates multiple signed URLs. Use a signed URL to share a file for a fixed amount of time.
         *
         * @param paths The file paths to be downloaded, including the current file names. For example `['folder/image.png', 'folder2/image2.png']`.
         * @param expiresIn The number of seconds until the signed URLs expire. For example, `60` for URLs which are valid for one minute.
         * @param options.download triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
         */
        createSignedUrls(paths, expiresIn, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              const data = yield post(this.fetch, `${this.url}/object/sign/${this.bucketId}`, { expiresIn, paths }, { headers: this.headers });
              const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `&download=${options.download === true ? "" : options.download}` : "";
              return {
                data: data.map((datum) => Object.assign(Object.assign({}, datum), { signedUrl: datum.signedURL ? encodeURI(`${this.url}${datum.signedURL}${downloadQueryParam}`) : null })),
                error: null
              };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Downloads a file from a private bucket. For public buckets, make a request to the URL returned from `getPublicUrl` instead.
         *
         * @param path The full path and file name of the file to be downloaded. For example `folder/image.png`.
         * @param options.transform Transform the asset before serving it to the client.
         */
        download(path, options) {
          return __awaiter4(this, void 0, void 0, function* () {
            const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
            const renderPath = wantsTransformation ? "render/image/authenticated" : "object";
            const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
            const queryString = transformationQuery ? `?${transformationQuery}` : "";
            try {
              const _path = this._getFinalPath(path);
              const res = yield get(this.fetch, `${this.url}/${renderPath}/${_path}${queryString}`, {
                headers: this.headers,
                noResolveJson: true
              });
              const data = yield res.blob();
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Retrieves the details of an existing file.
         * @param path
         */
        info(path) {
          return __awaiter4(this, void 0, void 0, function* () {
            const _path = this._getFinalPath(path);
            try {
              const data = yield get(this.fetch, `${this.url}/object/info/${_path}`, {
                headers: this.headers
              });
              return { data: recursiveToCamel(data), error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Checks the existence of a file.
         * @param path
         */
        exists(path) {
          return __awaiter4(this, void 0, void 0, function* () {
            const _path = this._getFinalPath(path);
            try {
              yield head(this.fetch, `${this.url}/object/${_path}`, {
                headers: this.headers
              });
              return { data: true, error: null };
            } catch (error) {
              if (isStorageError(error) && error instanceof StorageUnknownError) {
                const originalError = error.originalError;
                if ([400, 404].includes(originalError === null || originalError === void 0 ? void 0 : originalError.status)) {
                  return { data: false, error };
                }
              }
              throw error;
            }
          });
        }
        /**
         * A simple convenience function to get the URL for an asset in a public bucket. If you do not want to use this function, you can construct the public URL by concatenating the bucket URL with the path to the asset.
         * This function does not verify if the bucket is public. If a public URL is created for a bucket which is not public, you will not be able to download the asset.
         *
         * @param path The path and name of the file to generate the public URL for. For example `folder/image.png`.
         * @param options.download Triggers the file as a download if set to true. Set this parameter as the name of the file if you want to trigger the download with a different filename.
         * @param options.transform Transform the asset before serving it to the client.
         */
        getPublicUrl(path, options) {
          const _path = this._getFinalPath(path);
          const _queryString = [];
          const downloadQueryParam = (options === null || options === void 0 ? void 0 : options.download) ? `download=${options.download === true ? "" : options.download}` : "";
          if (downloadQueryParam !== "") {
            _queryString.push(downloadQueryParam);
          }
          const wantsTransformation = typeof (options === null || options === void 0 ? void 0 : options.transform) !== "undefined";
          const renderPath = wantsTransformation ? "render/image" : "object";
          const transformationQuery = this.transformOptsToQueryString((options === null || options === void 0 ? void 0 : options.transform) || {});
          if (transformationQuery !== "") {
            _queryString.push(transformationQuery);
          }
          let queryString = _queryString.join("&");
          if (queryString !== "") {
            queryString = `?${queryString}`;
          }
          return {
            data: { publicUrl: encodeURI(`${this.url}/${renderPath}/public/${_path}${queryString}`) }
          };
        }
        /**
         * Deletes files within the same bucket
         *
         * @param paths An array of files to delete, including the path and file name. For example [`'folder/image.png'`].
         */
        remove(paths) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              const data = yield remove(this.fetch, `${this.url}/object/${this.bucketId}`, { prefixes: paths }, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Get file metadata
         * @param id the file id to retrieve metadata
         */
        // async getMetadata(
        //   id: string
        // ): Promise<
        //   | {
        //       data: Metadata
        //       error: null
        //     }
        //   | {
        //       data: null
        //       error: StorageError
        //     }
        // > {
        //   try {
        //     const data = await get(this.fetch, `${this.url}/metadata/${id}`, { headers: this.headers })
        //     return { data, error: null }
        //   } catch (error) {
        //     if (isStorageError(error)) {
        //       return { data: null, error }
        //     }
        //     throw error
        //   }
        // }
        /**
         * Update file metadata
         * @param id the file id to update metadata
         * @param meta the new file metadata
         */
        // async updateMetadata(
        //   id: string,
        //   meta: Metadata
        // ): Promise<
        //   | {
        //       data: Metadata
        //       error: null
        //     }
        //   | {
        //       data: null
        //       error: StorageError
        //     }
        // > {
        //   try {
        //     const data = await post(
        //       this.fetch,
        //       `${this.url}/metadata/${id}`,
        //       { ...meta },
        //       { headers: this.headers }
        //     )
        //     return { data, error: null }
        //   } catch (error) {
        //     if (isStorageError(error)) {
        //       return { data: null, error }
        //     }
        //     throw error
        //   }
        // }
        /**
         * Lists all the files within a bucket.
         * @param path The folder path.
         */
        list(path, options, parameters) {
          return __awaiter4(this, void 0, void 0, function* () {
            try {
              const body = Object.assign(Object.assign(Object.assign({}, DEFAULT_SEARCH_OPTIONS), options), { prefix: path || "" });
              const data = yield post(this.fetch, `${this.url}/object/list/${this.bucketId}`, body, { headers: this.headers }, parameters);
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        encodeMetadata(metadata) {
          return JSON.stringify(metadata);
        }
        toBase64(data) {
          if (typeof Buffer !== "undefined") {
            return Buffer.from(data).toString("base64");
          }
          return btoa(data);
        }
        _getFinalPath(path) {
          return `${this.bucketId}/${path}`;
        }
        _removeEmptyFolders(path) {
          return path.replace(/^\/|\/$/g, "").replace(/\/+/g, "/");
        }
        transformOptsToQueryString(transform) {
          const params = [];
          if (transform.width) {
            params.push(`width=${transform.width}`);
          }
          if (transform.height) {
            params.push(`height=${transform.height}`);
          }
          if (transform.resize) {
            params.push(`resize=${transform.resize}`);
          }
          if (transform.format) {
            params.push(`format=${transform.format}`);
          }
          if (transform.quality) {
            params.push(`quality=${transform.quality}`);
          }
          return params.join("&");
        }
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/version.js
  var version2;
  var init_version2 = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/version.js"() {
      version2 = "2.7.1";
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/constants.js
  var DEFAULT_HEADERS2;
  var init_constants2 = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/constants.js"() {
      init_version2();
      DEFAULT_HEADERS2 = { "X-Client-Info": `storage-js/${version2}` };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js
  var __awaiter5, StorageBucketApi;
  var init_StorageBucketApi = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/packages/StorageBucketApi.js"() {
      init_constants2();
      init_errors();
      init_fetch();
      init_helpers();
      __awaiter5 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      StorageBucketApi = class {
        constructor(url, headers = {}, fetch3) {
          this.url = url;
          this.headers = Object.assign(Object.assign({}, DEFAULT_HEADERS2), headers);
          this.fetch = resolveFetch2(fetch3);
        }
        /**
         * Retrieves the details of all Storage buckets within an existing project.
         */
        listBuckets() {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield get(this.fetch, `${this.url}/bucket`, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Retrieves the details of an existing Storage bucket.
         *
         * @param id The unique identifier of the bucket you would like to retrieve.
         */
        getBucket(id) {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield get(this.fetch, `${this.url}/bucket/${id}`, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Creates a new Storage bucket
         *
         * @param id A unique identifier for the bucket you are creating.
         * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations. By default, buckets are private.
         * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
         * The global file size limit takes precedence over this value.
         * The default value is null, which doesn't set a per bucket file size limit.
         * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
         * The default value is null, which allows files with all mime types to be uploaded.
         * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
         * @returns newly created bucket id
         */
        createBucket(id, options = {
          public: false
        }) {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield post(this.fetch, `${this.url}/bucket`, {
                id,
                name: id,
                public: options.public,
                file_size_limit: options.fileSizeLimit,
                allowed_mime_types: options.allowedMimeTypes
              }, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Updates a Storage bucket
         *
         * @param id A unique identifier for the bucket you are updating.
         * @param options.public The visibility of the bucket. Public buckets don't require an authorization token to download objects, but still require a valid token for all other operations.
         * @param options.fileSizeLimit specifies the max file size in bytes that can be uploaded to this bucket.
         * The global file size limit takes precedence over this value.
         * The default value is null, which doesn't set a per bucket file size limit.
         * @param options.allowedMimeTypes specifies the allowed mime types that this bucket can accept during upload.
         * The default value is null, which allows files with all mime types to be uploaded.
         * Each mime type specified can be a wildcard, e.g. image/*, or a specific mime type, e.g. image/png.
         */
        updateBucket(id, options) {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield put(this.fetch, `${this.url}/bucket/${id}`, {
                id,
                name: id,
                public: options.public,
                file_size_limit: options.fileSizeLimit,
                allowed_mime_types: options.allowedMimeTypes
              }, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Removes all objects inside a single bucket.
         *
         * @param id The unique identifier of the bucket you would like to empty.
         */
        emptyBucket(id) {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield post(this.fetch, `${this.url}/bucket/${id}/empty`, {}, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * Deletes an existing bucket. A bucket can't be deleted with existing objects inside it.
         * You must first `empty()` the bucket.
         *
         * @param id The unique identifier of the bucket you would like to delete.
         */
        deleteBucket(id) {
          return __awaiter5(this, void 0, void 0, function* () {
            try {
              const data = yield remove(this.fetch, `${this.url}/bucket/${id}`, {}, { headers: this.headers });
              return { data, error: null };
            } catch (error) {
              if (isStorageError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/StorageClient.js
  var StorageClient;
  var init_StorageClient = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/StorageClient.js"() {
      init_StorageFileApi();
      init_StorageBucketApi();
      StorageClient = class extends StorageBucketApi {
        constructor(url, headers = {}, fetch3) {
          super(url, headers, fetch3);
        }
        /**
         * Perform file operation in a bucket.
         *
         * @param id The bucket id to operate on.
         */
        from(id) {
          return new StorageFileApi(this.url, this.headers, id, this.fetch);
        }
      };
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/lib/types.js
  var init_types2 = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/lib/types.js"() {
    }
  });

  // project/node_modules/@supabase/storage-js/dist/module/index.js
  var init_module3 = __esm({
    "project/node_modules/@supabase/storage-js/dist/module/index.js"() {
      init_StorageClient();
      init_types2();
      init_errors();
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/lib/version.js
  var version3;
  var init_version3 = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/lib/version.js"() {
      version3 = "2.50.0";
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/lib/constants.js
  var JS_ENV, DEFAULT_HEADERS3, DEFAULT_GLOBAL_OPTIONS, DEFAULT_DB_OPTIONS, DEFAULT_AUTH_OPTIONS, DEFAULT_REALTIME_OPTIONS;
  var init_constants3 = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/lib/constants.js"() {
      init_version3();
      JS_ENV = "";
      if (typeof Deno !== "undefined") {
        JS_ENV = "deno";
      } else if (typeof document !== "undefined") {
        JS_ENV = "web";
      } else if (typeof navigator !== "undefined" && navigator.product === "ReactNative") {
        JS_ENV = "react-native";
      } else {
        JS_ENV = "node";
      }
      DEFAULT_HEADERS3 = { "X-Client-Info": `supabase-js-${JS_ENV}/${version3}` };
      DEFAULT_GLOBAL_OPTIONS = {
        headers: DEFAULT_HEADERS3
      };
      DEFAULT_DB_OPTIONS = {
        schema: "public"
      };
      DEFAULT_AUTH_OPTIONS = {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "implicit"
      };
      DEFAULT_REALTIME_OPTIONS = {};
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/lib/fetch.js
  var __awaiter6, resolveFetch3, resolveHeadersConstructor, fetchWithAuth;
  var init_fetch2 = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/lib/fetch.js"() {
      init_browser();
      __awaiter6 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      resolveFetch3 = (customFetch) => {
        let _fetch;
        if (customFetch) {
          _fetch = customFetch;
        } else if (typeof fetch === "undefined") {
          _fetch = browser_default;
        } else {
          _fetch = fetch;
        }
        return (...args) => _fetch(...args);
      };
      resolveHeadersConstructor = () => {
        if (typeof Headers === "undefined") {
          return Headers2;
        }
        return Headers;
      };
      fetchWithAuth = (supabaseKey, getAccessToken, customFetch) => {
        const fetch3 = resolveFetch3(customFetch);
        const HeadersConstructor = resolveHeadersConstructor();
        return (input, init) => __awaiter6(void 0, void 0, void 0, function* () {
          var _a;
          const accessToken = (_a = yield getAccessToken()) !== null && _a !== void 0 ? _a : supabaseKey;
          let headers = new HeadersConstructor(init === null || init === void 0 ? void 0 : init.headers);
          if (!headers.has("apikey")) {
            headers.set("apikey", supabaseKey);
          }
          if (!headers.has("Authorization")) {
            headers.set("Authorization", `Bearer ${accessToken}`);
          }
          return fetch3(input, Object.assign(Object.assign({}, init), { headers }));
        });
      };
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/lib/helpers.js
  function ensureTrailingSlash(url) {
    return url.endsWith("/") ? url : url + "/";
  }
  function applySettingDefaults(options, defaults) {
    var _a, _b;
    const { db: dbOptions, auth: authOptions, realtime: realtimeOptions, global: globalOptions } = options;
    const { db: DEFAULT_DB_OPTIONS2, auth: DEFAULT_AUTH_OPTIONS2, realtime: DEFAULT_REALTIME_OPTIONS2, global: DEFAULT_GLOBAL_OPTIONS2 } = defaults;
    const result = {
      db: Object.assign(Object.assign({}, DEFAULT_DB_OPTIONS2), dbOptions),
      auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS2), authOptions),
      realtime: Object.assign(Object.assign({}, DEFAULT_REALTIME_OPTIONS2), realtimeOptions),
      global: Object.assign(Object.assign(Object.assign({}, DEFAULT_GLOBAL_OPTIONS2), globalOptions), { headers: Object.assign(Object.assign({}, (_a = DEFAULT_GLOBAL_OPTIONS2 === null || DEFAULT_GLOBAL_OPTIONS2 === void 0 ? void 0 : DEFAULT_GLOBAL_OPTIONS2.headers) !== null && _a !== void 0 ? _a : {}), (_b = globalOptions === null || globalOptions === void 0 ? void 0 : globalOptions.headers) !== null && _b !== void 0 ? _b : {}) }),
      accessToken: () => __awaiter7(this, void 0, void 0, function* () {
        return "";
      })
    };
    if (options.accessToken) {
      result.accessToken = options.accessToken;
    } else {
      delete result.accessToken;
    }
    return result;
  }
  var __awaiter7;
  var init_helpers2 = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/lib/helpers.js"() {
      __awaiter7 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/version.js
  var version4;
  var init_version4 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/version.js"() {
      version4 = "2.70.0";
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/constants.js
  var AUTO_REFRESH_TICK_DURATION_MS, AUTO_REFRESH_TICK_THRESHOLD, EXPIRY_MARGIN_MS, GOTRUE_URL, STORAGE_KEY, DEFAULT_HEADERS4, API_VERSION_HEADER_NAME, API_VERSIONS, BASE64URL_REGEX, JWKS_TTL;
  var init_constants4 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/constants.js"() {
      init_version4();
      AUTO_REFRESH_TICK_DURATION_MS = 30 * 1e3;
      AUTO_REFRESH_TICK_THRESHOLD = 3;
      EXPIRY_MARGIN_MS = AUTO_REFRESH_TICK_THRESHOLD * AUTO_REFRESH_TICK_DURATION_MS;
      GOTRUE_URL = "http://localhost:9999";
      STORAGE_KEY = "supabase.auth.token";
      DEFAULT_HEADERS4 = { "X-Client-Info": `gotrue-js/${version4}` };
      API_VERSION_HEADER_NAME = "X-Supabase-Api-Version";
      API_VERSIONS = {
        "2024-01-01": {
          timestamp: Date.parse("2024-01-01T00:00:00.0Z"),
          name: "2024-01-01"
        }
      };
      BASE64URL_REGEX = /^([a-z0-9_-]{4})*($|[a-z0-9_-]{3}$|[a-z0-9_-]{2}$)$/i;
      JWKS_TTL = 6e5;
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/errors.js
  function isAuthError(error) {
    return typeof error === "object" && error !== null && "__isAuthError" in error;
  }
  function isAuthApiError(error) {
    return isAuthError(error) && error.name === "AuthApiError";
  }
  function isAuthSessionMissingError(error) {
    return isAuthError(error) && error.name === "AuthSessionMissingError";
  }
  function isAuthImplicitGrantRedirectError(error) {
    return isAuthError(error) && error.name === "AuthImplicitGrantRedirectError";
  }
  function isAuthRetryableFetchError(error) {
    return isAuthError(error) && error.name === "AuthRetryableFetchError";
  }
  function isAuthWeakPasswordError(error) {
    return isAuthError(error) && error.name === "AuthWeakPasswordError";
  }
  var AuthError, AuthApiError, AuthUnknownError, CustomAuthError, AuthSessionMissingError, AuthInvalidTokenResponseError, AuthInvalidCredentialsError, AuthImplicitGrantRedirectError, AuthPKCEGrantCodeExchangeError, AuthRetryableFetchError, AuthWeakPasswordError, AuthInvalidJwtError;
  var init_errors2 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/errors.js"() {
      AuthError = class extends Error {
        constructor(message, status, code) {
          super(message);
          this.__isAuthError = true;
          this.name = "AuthError";
          this.status = status;
          this.code = code;
        }
      };
      AuthApiError = class extends AuthError {
        constructor(message, status, code) {
          super(message, status, code);
          this.name = "AuthApiError";
          this.status = status;
          this.code = code;
        }
      };
      AuthUnknownError = class extends AuthError {
        constructor(message, originalError) {
          super(message);
          this.name = "AuthUnknownError";
          this.originalError = originalError;
        }
      };
      CustomAuthError = class extends AuthError {
        constructor(message, name, status, code) {
          super(message, status, code);
          this.name = name;
          this.status = status;
        }
      };
      AuthSessionMissingError = class extends CustomAuthError {
        constructor() {
          super("Auth session missing!", "AuthSessionMissingError", 400, void 0);
        }
      };
      AuthInvalidTokenResponseError = class extends CustomAuthError {
        constructor() {
          super("Auth session or user missing", "AuthInvalidTokenResponseError", 500, void 0);
        }
      };
      AuthInvalidCredentialsError = class extends CustomAuthError {
        constructor(message) {
          super(message, "AuthInvalidCredentialsError", 400, void 0);
        }
      };
      AuthImplicitGrantRedirectError = class extends CustomAuthError {
        constructor(message, details = null) {
          super(message, "AuthImplicitGrantRedirectError", 500, void 0);
          this.details = null;
          this.details = details;
        }
        toJSON() {
          return {
            name: this.name,
            message: this.message,
            status: this.status,
            details: this.details
          };
        }
      };
      AuthPKCEGrantCodeExchangeError = class extends CustomAuthError {
        constructor(message, details = null) {
          super(message, "AuthPKCEGrantCodeExchangeError", 500, void 0);
          this.details = null;
          this.details = details;
        }
        toJSON() {
          return {
            name: this.name,
            message: this.message,
            status: this.status,
            details: this.details
          };
        }
      };
      AuthRetryableFetchError = class extends CustomAuthError {
        constructor(message, status) {
          super(message, "AuthRetryableFetchError", status, void 0);
        }
      };
      AuthWeakPasswordError = class extends CustomAuthError {
        constructor(message, status, reasons) {
          super(message, "AuthWeakPasswordError", status, "weak_password");
          this.reasons = reasons;
        }
      };
      AuthInvalidJwtError = class extends CustomAuthError {
        constructor(message) {
          super(message, "AuthInvalidJwtError", 400, "invalid_jwt");
        }
      };
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/base64url.js
  function byteToBase64URL(byte, state, emit) {
    if (byte !== null) {
      state.queue = state.queue << 8 | byte;
      state.queuedBits += 8;
      while (state.queuedBits >= 6) {
        const pos = state.queue >> state.queuedBits - 6 & 63;
        emit(TO_BASE64URL[pos]);
        state.queuedBits -= 6;
      }
    } else if (state.queuedBits > 0) {
      state.queue = state.queue << 6 - state.queuedBits;
      state.queuedBits = 6;
      while (state.queuedBits >= 6) {
        const pos = state.queue >> state.queuedBits - 6 & 63;
        emit(TO_BASE64URL[pos]);
        state.queuedBits -= 6;
      }
    }
  }
  function byteFromBase64URL(charCode, state, emit) {
    const bits = FROM_BASE64URL[charCode];
    if (bits > -1) {
      state.queue = state.queue << 6 | bits;
      state.queuedBits += 6;
      while (state.queuedBits >= 8) {
        emit(state.queue >> state.queuedBits - 8 & 255);
        state.queuedBits -= 8;
      }
    } else if (bits === -2) {
      return;
    } else {
      throw new Error(`Invalid Base64-URL character "${String.fromCharCode(charCode)}"`);
    }
  }
  function stringFromBase64URL(str) {
    const conv = [];
    const utf8Emit = (codepoint) => {
      conv.push(String.fromCodePoint(codepoint));
    };
    const utf8State = {
      utf8seq: 0,
      codepoint: 0
    };
    const b64State = { queue: 0, queuedBits: 0 };
    const byteEmit = (byte) => {
      stringFromUTF8(byte, utf8State, utf8Emit);
    };
    for (let i = 0; i < str.length; i += 1) {
      byteFromBase64URL(str.charCodeAt(i), b64State, byteEmit);
    }
    return conv.join("");
  }
  function codepointToUTF8(codepoint, emit) {
    if (codepoint <= 127) {
      emit(codepoint);
      return;
    } else if (codepoint <= 2047) {
      emit(192 | codepoint >> 6);
      emit(128 | codepoint & 63);
      return;
    } else if (codepoint <= 65535) {
      emit(224 | codepoint >> 12);
      emit(128 | codepoint >> 6 & 63);
      emit(128 | codepoint & 63);
      return;
    } else if (codepoint <= 1114111) {
      emit(240 | codepoint >> 18);
      emit(128 | codepoint >> 12 & 63);
      emit(128 | codepoint >> 6 & 63);
      emit(128 | codepoint & 63);
      return;
    }
    throw new Error(`Unrecognized Unicode codepoint: ${codepoint.toString(16)}`);
  }
  function stringToUTF8(str, emit) {
    for (let i = 0; i < str.length; i += 1) {
      let codepoint = str.charCodeAt(i);
      if (codepoint > 55295 && codepoint <= 56319) {
        const highSurrogate = (codepoint - 55296) * 1024 & 65535;
        const lowSurrogate = str.charCodeAt(i + 1) - 56320 & 65535;
        codepoint = (lowSurrogate | highSurrogate) + 65536;
        i += 1;
      }
      codepointToUTF8(codepoint, emit);
    }
  }
  function stringFromUTF8(byte, state, emit) {
    if (state.utf8seq === 0) {
      if (byte <= 127) {
        emit(byte);
        return;
      }
      for (let leadingBit = 1; leadingBit < 6; leadingBit += 1) {
        if ((byte >> 7 - leadingBit & 1) === 0) {
          state.utf8seq = leadingBit;
          break;
        }
      }
      if (state.utf8seq === 2) {
        state.codepoint = byte & 31;
      } else if (state.utf8seq === 3) {
        state.codepoint = byte & 15;
      } else if (state.utf8seq === 4) {
        state.codepoint = byte & 7;
      } else {
        throw new Error("Invalid UTF-8 sequence");
      }
      state.utf8seq -= 1;
    } else if (state.utf8seq > 0) {
      if (byte <= 127) {
        throw new Error("Invalid UTF-8 sequence");
      }
      state.codepoint = state.codepoint << 6 | byte & 63;
      state.utf8seq -= 1;
      if (state.utf8seq === 0) {
        emit(state.codepoint);
      }
    }
  }
  function base64UrlToUint8Array(str) {
    const result = [];
    const state = { queue: 0, queuedBits: 0 };
    const onByte = (byte) => {
      result.push(byte);
    };
    for (let i = 0; i < str.length; i += 1) {
      byteFromBase64URL(str.charCodeAt(i), state, onByte);
    }
    return new Uint8Array(result);
  }
  function stringToUint8Array(str) {
    const result = [];
    stringToUTF8(str, (byte) => result.push(byte));
    return new Uint8Array(result);
  }
  function bytesToBase64URL(bytes) {
    const result = [];
    const state = { queue: 0, queuedBits: 0 };
    const onChar = (char) => {
      result.push(char);
    };
    bytes.forEach((byte) => byteToBase64URL(byte, state, onChar));
    byteToBase64URL(null, state, onChar);
    return result.join("");
  }
  var TO_BASE64URL, IGNORE_BASE64URL, FROM_BASE64URL;
  var init_base64url = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/base64url.js"() {
      TO_BASE64URL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_".split("");
      IGNORE_BASE64URL = " 	\n\r=".split("");
      FROM_BASE64URL = (() => {
        const charMap = new Array(128);
        for (let i = 0; i < charMap.length; i += 1) {
          charMap[i] = -1;
        }
        for (let i = 0; i < IGNORE_BASE64URL.length; i += 1) {
          charMap[IGNORE_BASE64URL[i].charCodeAt(0)] = -2;
        }
        for (let i = 0; i < TO_BASE64URL.length; i += 1) {
          charMap[TO_BASE64URL[i].charCodeAt(0)] = i;
        }
        return charMap;
      })();
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/helpers.js
  function expiresAt(expiresIn) {
    const timeNow = Math.round(Date.now() / 1e3);
    return timeNow + expiresIn;
  }
  function uuid() {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == "x" ? r : r & 3 | 8;
      return v.toString(16);
    });
  }
  function parseParametersFromURL(href) {
    const result = {};
    const url = new URL(href);
    if (url.hash && url.hash[0] === "#") {
      try {
        const hashSearchParams = new URLSearchParams(url.hash.substring(1));
        hashSearchParams.forEach((value, key) => {
          result[key] = value;
        });
      } catch (e) {
      }
    }
    url.searchParams.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }
  function decodeJWT(token) {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new AuthInvalidJwtError("Invalid JWT structure");
    }
    for (let i = 0; i < parts.length; i++) {
      if (!BASE64URL_REGEX.test(parts[i])) {
        throw new AuthInvalidJwtError("JWT not in base64url format");
      }
    }
    const data = {
      // using base64url lib
      header: JSON.parse(stringFromBase64URL(parts[0])),
      payload: JSON.parse(stringFromBase64URL(parts[1])),
      signature: base64UrlToUint8Array(parts[2]),
      raw: {
        header: parts[0],
        payload: parts[1]
      }
    };
    return data;
  }
  async function sleep(time) {
    return await new Promise((accept) => {
      setTimeout(() => accept(null), time);
    });
  }
  function retryable(fn, isRetryable) {
    const promise = new Promise((accept, reject) => {
      ;
      (async () => {
        for (let attempt = 0; attempt < Infinity; attempt++) {
          try {
            const result = await fn(attempt);
            if (!isRetryable(attempt, null, result)) {
              accept(result);
              return;
            }
          } catch (e) {
            if (!isRetryable(attempt, e)) {
              reject(e);
              return;
            }
          }
        }
      })();
    });
    return promise;
  }
  function dec2hex(dec) {
    return ("0" + dec.toString(16)).substr(-2);
  }
  function generatePKCEVerifier() {
    const verifierLength = 56;
    const array = new Uint32Array(verifierLength);
    if (typeof crypto === "undefined") {
      const charSet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      const charSetLen = charSet.length;
      let verifier = "";
      for (let i = 0; i < verifierLength; i++) {
        verifier += charSet.charAt(Math.floor(Math.random() * charSetLen));
      }
      return verifier;
    }
    crypto.getRandomValues(array);
    return Array.from(array, dec2hex).join("");
  }
  async function sha256(randomString) {
    const encoder = new TextEncoder();
    const encodedData = encoder.encode(randomString);
    const hash = await crypto.subtle.digest("SHA-256", encodedData);
    const bytes = new Uint8Array(hash);
    return Array.from(bytes).map((c) => String.fromCharCode(c)).join("");
  }
  async function generatePKCEChallenge(verifier) {
    const hasCryptoSupport = typeof crypto !== "undefined" && typeof crypto.subtle !== "undefined" && typeof TextEncoder !== "undefined";
    if (!hasCryptoSupport) {
      console.warn("WebCrypto API is not supported. Code challenge method will default to use plain instead of sha256.");
      return verifier;
    }
    const hashed = await sha256(verifier);
    return btoa(hashed).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  async function getCodeChallengeAndMethod(storage, storageKey, isPasswordRecovery = false) {
    const codeVerifier = generatePKCEVerifier();
    let storedCodeVerifier = codeVerifier;
    if (isPasswordRecovery) {
      storedCodeVerifier += "/PASSWORD_RECOVERY";
    }
    await setItemAsync(storage, `${storageKey}-code-verifier`, storedCodeVerifier);
    const codeChallenge = await generatePKCEChallenge(codeVerifier);
    const codeChallengeMethod = codeVerifier === codeChallenge ? "plain" : "s256";
    return [codeChallenge, codeChallengeMethod];
  }
  function parseResponseAPIVersion(response) {
    const apiVersion = response.headers.get(API_VERSION_HEADER_NAME);
    if (!apiVersion) {
      return null;
    }
    if (!apiVersion.match(API_VERSION_REGEX)) {
      return null;
    }
    try {
      const date = /* @__PURE__ */ new Date(`${apiVersion}T00:00:00.0Z`);
      return date;
    } catch (e) {
      return null;
    }
  }
  function validateExp(exp) {
    if (!exp) {
      throw new Error("Missing exp claim");
    }
    const timeNow = Math.floor(Date.now() / 1e3);
    if (exp <= timeNow) {
      throw new Error("JWT has expired");
    }
  }
  function getAlgorithm(alg) {
    switch (alg) {
      case "RS256":
        return {
          name: "RSASSA-PKCS1-v1_5",
          hash: { name: "SHA-256" }
        };
      case "ES256":
        return {
          name: "ECDSA",
          namedCurve: "P-256",
          hash: { name: "SHA-256" }
        };
      default:
        throw new Error("Invalid alg claim");
    }
  }
  function validateUUID(str) {
    if (!UUID_REGEX.test(str)) {
      throw new Error("@supabase/auth-js: Expected parameter to be UUID but is not");
    }
  }
  var isBrowser, localStorageWriteTests, supportsLocalStorage, resolveFetch4, looksLikeFetchResponse, setItemAsync, getItemAsync, removeItemAsync, Deferred, API_VERSION_REGEX, UUID_REGEX;
  var init_helpers3 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/helpers.js"() {
      init_constants4();
      init_errors2();
      init_base64url();
      isBrowser = () => typeof window !== "undefined" && typeof document !== "undefined";
      localStorageWriteTests = {
        tested: false,
        writable: false
      };
      supportsLocalStorage = () => {
        if (!isBrowser()) {
          return false;
        }
        try {
          if (typeof globalThis.localStorage !== "object") {
            return false;
          }
        } catch (e) {
          return false;
        }
        if (localStorageWriteTests.tested) {
          return localStorageWriteTests.writable;
        }
        const randomKey = `lswt-${Math.random()}${Math.random()}`;
        try {
          globalThis.localStorage.setItem(randomKey, randomKey);
          globalThis.localStorage.removeItem(randomKey);
          localStorageWriteTests.tested = true;
          localStorageWriteTests.writable = true;
        } catch (e) {
          localStorageWriteTests.tested = true;
          localStorageWriteTests.writable = false;
        }
        return localStorageWriteTests.writable;
      };
      resolveFetch4 = (customFetch) => {
        let _fetch;
        if (customFetch) {
          _fetch = customFetch;
        } else if (typeof fetch === "undefined") {
          _fetch = (...args) => Promise.resolve().then(() => (init_browser(), browser_exports)).then(({ default: fetch3 }) => fetch3(...args));
        } else {
          _fetch = fetch;
        }
        return (...args) => _fetch(...args);
      };
      looksLikeFetchResponse = (maybeResponse) => {
        return typeof maybeResponse === "object" && maybeResponse !== null && "status" in maybeResponse && "ok" in maybeResponse && "json" in maybeResponse && typeof maybeResponse.json === "function";
      };
      setItemAsync = async (storage, key, data) => {
        await storage.setItem(key, JSON.stringify(data));
      };
      getItemAsync = async (storage, key) => {
        const value = await storage.getItem(key);
        if (!value) {
          return null;
        }
        try {
          return JSON.parse(value);
        } catch (_a) {
          return value;
        }
      };
      removeItemAsync = async (storage, key) => {
        await storage.removeItem(key);
      };
      Deferred = class _Deferred {
        constructor() {
          ;
          this.promise = new _Deferred.promiseConstructor((res, rej) => {
            ;
            this.resolve = res;
            this.reject = rej;
          });
        }
      };
      Deferred.promiseConstructor = Promise;
      API_VERSION_REGEX = /^2[0-9]{3}-(0[1-9]|1[0-2])-(0[1-9]|1[0-9]|2[0-9]|3[0-1])$/i;
      UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/fetch.js
  async function handleError2(error) {
    var _a;
    if (!looksLikeFetchResponse(error)) {
      throw new AuthRetryableFetchError(_getErrorMessage2(error), 0);
    }
    if (NETWORK_ERROR_CODES.includes(error.status)) {
      throw new AuthRetryableFetchError(_getErrorMessage2(error), error.status);
    }
    let data;
    try {
      data = await error.json();
    } catch (e) {
      throw new AuthUnknownError(_getErrorMessage2(e), e);
    }
    let errorCode = void 0;
    const responseAPIVersion = parseResponseAPIVersion(error);
    if (responseAPIVersion && responseAPIVersion.getTime() >= API_VERSIONS["2024-01-01"].timestamp && typeof data === "object" && data && typeof data.code === "string") {
      errorCode = data.code;
    } else if (typeof data === "object" && data && typeof data.error_code === "string") {
      errorCode = data.error_code;
    }
    if (!errorCode) {
      if (typeof data === "object" && data && typeof data.weak_password === "object" && data.weak_password && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
        throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, data.weak_password.reasons);
      }
    } else if (errorCode === "weak_password") {
      throw new AuthWeakPasswordError(_getErrorMessage2(data), error.status, ((_a = data.weak_password) === null || _a === void 0 ? void 0 : _a.reasons) || []);
    } else if (errorCode === "session_not_found") {
      throw new AuthSessionMissingError();
    }
    throw new AuthApiError(_getErrorMessage2(data), error.status || 500, errorCode);
  }
  async function _request(fetcher, method, url, options) {
    var _a;
    const headers = Object.assign({}, options === null || options === void 0 ? void 0 : options.headers);
    if (!headers[API_VERSION_HEADER_NAME]) {
      headers[API_VERSION_HEADER_NAME] = API_VERSIONS["2024-01-01"].name;
    }
    if (options === null || options === void 0 ? void 0 : options.jwt) {
      headers["Authorization"] = `Bearer ${options.jwt}`;
    }
    const qs = (_a = options === null || options === void 0 ? void 0 : options.query) !== null && _a !== void 0 ? _a : {};
    if (options === null || options === void 0 ? void 0 : options.redirectTo) {
      qs["redirect_to"] = options.redirectTo;
    }
    const queryString = Object.keys(qs).length ? "?" + new URLSearchParams(qs).toString() : "";
    const data = await _handleRequest2(fetcher, method, url + queryString, {
      headers,
      noResolveJson: options === null || options === void 0 ? void 0 : options.noResolveJson
    }, {}, options === null || options === void 0 ? void 0 : options.body);
    return (options === null || options === void 0 ? void 0 : options.xform) ? options === null || options === void 0 ? void 0 : options.xform(data) : { data: Object.assign({}, data), error: null };
  }
  async function _handleRequest2(fetcher, method, url, options, parameters, body) {
    const requestParams = _getRequestParams2(method, options, parameters, body);
    let result;
    try {
      result = await fetcher(url, Object.assign({}, requestParams));
    } catch (e) {
      console.error(e);
      throw new AuthRetryableFetchError(_getErrorMessage2(e), 0);
    }
    if (!result.ok) {
      await handleError2(result);
    }
    if (options === null || options === void 0 ? void 0 : options.noResolveJson) {
      return result;
    }
    try {
      return await result.json();
    } catch (e) {
      await handleError2(e);
    }
  }
  function _sessionResponse(data) {
    var _a;
    let session = null;
    if (hasSession(data)) {
      session = Object.assign({}, data);
      if (!data.expires_at) {
        session.expires_at = expiresAt(data.expires_in);
      }
    }
    const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
    return { data: { session, user }, error: null };
  }
  function _sessionResponsePassword(data) {
    const response = _sessionResponse(data);
    if (!response.error && data.weak_password && typeof data.weak_password === "object" && Array.isArray(data.weak_password.reasons) && data.weak_password.reasons.length && data.weak_password.message && typeof data.weak_password.message === "string" && data.weak_password.reasons.reduce((a, i) => a && typeof i === "string", true)) {
      response.data.weak_password = data.weak_password;
    }
    return response;
  }
  function _userResponse(data) {
    var _a;
    const user = (_a = data.user) !== null && _a !== void 0 ? _a : data;
    return { data: { user }, error: null };
  }
  function _ssoResponse(data) {
    return { data, error: null };
  }
  function _generateLinkResponse(data) {
    const { action_link, email_otp, hashed_token, redirect_to, verification_type } = data, rest = __rest(data, ["action_link", "email_otp", "hashed_token", "redirect_to", "verification_type"]);
    const properties = {
      action_link,
      email_otp,
      hashed_token,
      redirect_to,
      verification_type
    };
    const user = Object.assign({}, rest);
    return {
      data: {
        properties,
        user
      },
      error: null
    };
  }
  function _noResolveJsonResponse(data) {
    return data;
  }
  function hasSession(data) {
    return data.access_token && data.refresh_token && data.expires_in;
  }
  var __rest, _getErrorMessage2, NETWORK_ERROR_CODES, _getRequestParams2;
  var init_fetch3 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/fetch.js"() {
      init_constants4();
      init_helpers3();
      init_errors2();
      __rest = function(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
          }
        return t;
      };
      _getErrorMessage2 = (err) => err.msg || err.message || err.error_description || err.error || JSON.stringify(err);
      NETWORK_ERROR_CODES = [502, 503, 504];
      _getRequestParams2 = (method, options, parameters, body) => {
        const params = { method, headers: (options === null || options === void 0 ? void 0 : options.headers) || {} };
        if (method === "GET") {
          return params;
        }
        params.headers = Object.assign({ "Content-Type": "application/json;charset=UTF-8" }, options === null || options === void 0 ? void 0 : options.headers);
        params.body = JSON.stringify(body);
        return Object.assign(Object.assign({}, params), parameters);
      };
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/types.js
  var SIGN_OUT_SCOPES;
  var init_types3 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/types.js"() {
      SIGN_OUT_SCOPES = ["global", "local", "others"];
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js
  var __rest2, GoTrueAdminApi;
  var init_GoTrueAdminApi = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/GoTrueAdminApi.js"() {
      init_fetch3();
      init_helpers3();
      init_types3();
      init_errors2();
      __rest2 = function(s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
          t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
          for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
              t[p[i]] = s[p[i]];
          }
        return t;
      };
      GoTrueAdminApi = class {
        constructor({ url = "", headers = {}, fetch: fetch3 }) {
          this.url = url;
          this.headers = headers;
          this.fetch = resolveFetch4(fetch3);
          this.mfa = {
            listFactors: this._listFactors.bind(this),
            deleteFactor: this._deleteFactor.bind(this)
          };
        }
        /**
         * Removes a logged-in session.
         * @param jwt A valid, logged-in JWT.
         * @param scope The logout sope.
         */
        async signOut(jwt, scope = SIGN_OUT_SCOPES[0]) {
          if (SIGN_OUT_SCOPES.indexOf(scope) < 0) {
            throw new Error(`@supabase/auth-js: Parameter scope must be one of ${SIGN_OUT_SCOPES.join(", ")}`);
          }
          try {
            await _request(this.fetch, "POST", `${this.url}/logout?scope=${scope}`, {
              headers: this.headers,
              jwt,
              noResolveJson: true
            });
            return { data: null, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * Sends an invite link to an email address.
         * @param email The email address of the user.
         * @param options Additional options to be included when inviting.
         */
        async inviteUserByEmail(email, options = {}) {
          try {
            return await _request(this.fetch, "POST", `${this.url}/invite`, {
              body: { email, data: options.data },
              headers: this.headers,
              redirectTo: options.redirectTo,
              xform: _userResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Generates email links and OTPs to be sent via a custom email provider.
         * @param email The user's email.
         * @param options.password User password. For signup only.
         * @param options.data Optional user metadata. For signup only.
         * @param options.redirectTo The redirect url which should be appended to the generated link
         */
        async generateLink(params) {
          try {
            const { options } = params, rest = __rest2(params, ["options"]);
            const body = Object.assign(Object.assign({}, rest), options);
            if ("newEmail" in rest) {
              body.new_email = rest === null || rest === void 0 ? void 0 : rest.newEmail;
              delete body["newEmail"];
            }
            return await _request(this.fetch, "POST", `${this.url}/admin/generate_link`, {
              body,
              headers: this.headers,
              xform: _generateLinkResponse,
              redirectTo: options === null || options === void 0 ? void 0 : options.redirectTo
            });
          } catch (error) {
            if (isAuthError(error)) {
              return {
                data: {
                  properties: null,
                  user: null
                },
                error
              };
            }
            throw error;
          }
        }
        // User Admin API
        /**
         * Creates a new user.
         * This function should only be called on a server. Never expose your `service_role` key in the browser.
         */
        async createUser(attributes) {
          try {
            return await _request(this.fetch, "POST", `${this.url}/admin/users`, {
              body: attributes,
              headers: this.headers,
              xform: _userResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Get a list of users.
         *
         * This function should only be called on a server. Never expose your `service_role` key in the browser.
         * @param params An object which supports `page` and `perPage` as numbers, to alter the paginated results.
         */
        async listUsers(params) {
          var _a, _b, _c, _d, _e, _f, _g;
          try {
            const pagination = { nextPage: null, lastPage: 0, total: 0 };
            const response = await _request(this.fetch, "GET", `${this.url}/admin/users`, {
              headers: this.headers,
              noResolveJson: true,
              query: {
                page: (_b = (_a = params === null || params === void 0 ? void 0 : params.page) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : "",
                per_page: (_d = (_c = params === null || params === void 0 ? void 0 : params.perPage) === null || _c === void 0 ? void 0 : _c.toString()) !== null && _d !== void 0 ? _d : ""
              },
              xform: _noResolveJsonResponse
            });
            if (response.error)
              throw response.error;
            const users = await response.json();
            const total = (_e = response.headers.get("x-total-count")) !== null && _e !== void 0 ? _e : 0;
            const links = (_g = (_f = response.headers.get("link")) === null || _f === void 0 ? void 0 : _f.split(",")) !== null && _g !== void 0 ? _g : [];
            if (links.length > 0) {
              links.forEach((link) => {
                const page = parseInt(link.split(";")[0].split("=")[1].substring(0, 1));
                const rel = JSON.parse(link.split(";")[1].split("=")[1]);
                pagination[`${rel}Page`] = page;
              });
              pagination.total = parseInt(total);
            }
            return { data: Object.assign(Object.assign({}, users), pagination), error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { users: [] }, error };
            }
            throw error;
          }
        }
        /**
         * Get user by id.
         *
         * @param uid The user's unique identifier
         *
         * This function should only be called on a server. Never expose your `service_role` key in the browser.
         */
        async getUserById(uid) {
          validateUUID(uid);
          try {
            return await _request(this.fetch, "GET", `${this.url}/admin/users/${uid}`, {
              headers: this.headers,
              xform: _userResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Updates the user data.
         *
         * @param attributes The data you want to update.
         *
         * This function should only be called on a server. Never expose your `service_role` key in the browser.
         */
        async updateUserById(uid, attributes) {
          validateUUID(uid);
          try {
            return await _request(this.fetch, "PUT", `${this.url}/admin/users/${uid}`, {
              body: attributes,
              headers: this.headers,
              xform: _userResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Delete a user. Requires a `service_role` key.
         *
         * @param id The user id you want to remove.
         * @param shouldSoftDelete If true, then the user will be soft-deleted from the auth schema. Soft deletion allows user identification from the hashed user ID but is not reversible.
         * Defaults to false for backward compatibility.
         *
         * This function should only be called on a server. Never expose your `service_role` key in the browser.
         */
        async deleteUser(id, shouldSoftDelete = false) {
          validateUUID(id);
          try {
            return await _request(this.fetch, "DELETE", `${this.url}/admin/users/${id}`, {
              headers: this.headers,
              body: {
                should_soft_delete: shouldSoftDelete
              },
              xform: _userResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        async _listFactors(params) {
          validateUUID(params.userId);
          try {
            const { data, error } = await _request(this.fetch, "GET", `${this.url}/admin/users/${params.userId}/factors`, {
              headers: this.headers,
              xform: (factors) => {
                return { data: { factors }, error: null };
              }
            });
            return { data, error };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        async _deleteFactor(params) {
          validateUUID(params.userId);
          validateUUID(params.id);
          try {
            const data = await _request(this.fetch, "DELETE", `${this.url}/admin/users/${params.userId}/factors/${params.id}`, {
              headers: this.headers
            });
            return { data, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
      };
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/local-storage.js
  function memoryLocalStorageAdapter(store = {}) {
    return {
      getItem: (key) => {
        return store[key] || null;
      },
      setItem: (key, value) => {
        store[key] = value;
      },
      removeItem: (key) => {
        delete store[key];
      }
    };
  }
  var localStorageAdapter;
  var init_local_storage = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/local-storage.js"() {
      init_helpers3();
      localStorageAdapter = {
        getItem: (key) => {
          if (!supportsLocalStorage()) {
            return null;
          }
          return globalThis.localStorage.getItem(key);
        },
        setItem: (key, value) => {
          if (!supportsLocalStorage()) {
            return;
          }
          globalThis.localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          if (!supportsLocalStorage()) {
            return;
          }
          globalThis.localStorage.removeItem(key);
        }
      };
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/polyfills.js
  function polyfillGlobalThis() {
    if (typeof globalThis === "object")
      return;
    try {
      Object.defineProperty(Object.prototype, "__magic__", {
        get: function() {
          return this;
        },
        configurable: true
      });
      __magic__.globalThis = __magic__;
      delete Object.prototype.__magic__;
    } catch (e) {
      if (typeof self !== "undefined") {
        self.globalThis = self;
      }
    }
  }
  var init_polyfills = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/polyfills.js"() {
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/lib/locks.js
  async function navigatorLock(name, acquireTimeout, fn) {
    if (internals.debug) {
      console.log("@supabase/gotrue-js: navigatorLock: acquire lock", name, acquireTimeout);
    }
    const abortController = new globalThis.AbortController();
    if (acquireTimeout > 0) {
      setTimeout(() => {
        abortController.abort();
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock acquire timed out", name);
        }
      }, acquireTimeout);
    }
    return await Promise.resolve().then(() => globalThis.navigator.locks.request(name, acquireTimeout === 0 ? {
      mode: "exclusive",
      ifAvailable: true
    } : {
      mode: "exclusive",
      signal: abortController.signal
    }, async (lock) => {
      if (lock) {
        if (internals.debug) {
          console.log("@supabase/gotrue-js: navigatorLock: acquired", name, lock.name);
        }
        try {
          return await fn();
        } finally {
          if (internals.debug) {
            console.log("@supabase/gotrue-js: navigatorLock: released", name, lock.name);
          }
        }
      } else {
        if (acquireTimeout === 0) {
          if (internals.debug) {
            console.log("@supabase/gotrue-js: navigatorLock: not immediately available", name);
          }
          throw new NavigatorLockAcquireTimeoutError(`Acquiring an exclusive Navigator LockManager lock "${name}" immediately failed`);
        } else {
          if (internals.debug) {
            try {
              const result = await globalThis.navigator.locks.query();
              console.log("@supabase/gotrue-js: Navigator LockManager state", JSON.stringify(result, null, "  "));
            } catch (e) {
              console.warn("@supabase/gotrue-js: Error when querying Navigator LockManager state", e);
            }
          }
          console.warn("@supabase/gotrue-js: Navigator LockManager returned a null lock when using #request without ifAvailable set to true, it appears this browser is not following the LockManager spec https://developer.mozilla.org/en-US/docs/Web/API/LockManager/request");
          return await fn();
        }
      }
    }));
  }
  async function processLock(name, acquireTimeout, fn) {
    var _a;
    const previousOperation = (_a = PROCESS_LOCKS[name]) !== null && _a !== void 0 ? _a : Promise.resolve();
    const currentOperation = Promise.race([
      previousOperation.catch(() => {
        return null;
      }),
      acquireTimeout >= 0 ? new Promise((_, reject) => {
        setTimeout(() => {
          reject(new ProcessLockAcquireTimeoutError(`Acquring process lock with name "${name}" timed out`));
        }, acquireTimeout);
      }) : null
    ].filter((x) => x)).catch((e) => {
      if (e && e.isAcquireTimeout) {
        throw e;
      }
      return null;
    }).then(async () => {
      return await fn();
    });
    PROCESS_LOCKS[name] = currentOperation.catch(async (e) => {
      if (e && e.isAcquireTimeout) {
        await previousOperation;
        return null;
      }
      throw e;
    });
    return await currentOperation;
  }
  var internals, LockAcquireTimeoutError, NavigatorLockAcquireTimeoutError, ProcessLockAcquireTimeoutError, PROCESS_LOCKS;
  var init_locks = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/lib/locks.js"() {
      init_helpers3();
      internals = {
        /**
         * @experimental
         */
        debug: !!(globalThis && supportsLocalStorage() && globalThis.localStorage && globalThis.localStorage.getItem("supabase.gotrue-js.locks.debug") === "true")
      };
      LockAcquireTimeoutError = class extends Error {
        constructor(message) {
          super(message);
          this.isAcquireTimeout = true;
        }
      };
      NavigatorLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
      };
      ProcessLockAcquireTimeoutError = class extends LockAcquireTimeoutError {
      };
      PROCESS_LOCKS = {};
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/GoTrueClient.js
  async function lockNoOp(name, acquireTimeout, fn) {
    return await fn();
  }
  var DEFAULT_OPTIONS, GoTrueClient;
  var init_GoTrueClient = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/GoTrueClient.js"() {
      init_GoTrueAdminApi();
      init_constants4();
      init_errors2();
      init_fetch3();
      init_helpers3();
      init_local_storage();
      init_polyfills();
      init_version4();
      init_locks();
      init_base64url();
      polyfillGlobalThis();
      DEFAULT_OPTIONS = {
        url: GOTRUE_URL,
        storageKey: STORAGE_KEY,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        headers: DEFAULT_HEADERS4,
        flowType: "implicit",
        debug: false,
        hasCustomAuthorizationHeader: false
      };
      GoTrueClient = class _GoTrueClient {
        /**
         * Create a new client for use in the browser.
         */
        constructor(options) {
          var _a, _b;
          this.memoryStorage = null;
          this.stateChangeEmitters = /* @__PURE__ */ new Map();
          this.autoRefreshTicker = null;
          this.visibilityChangedCallback = null;
          this.refreshingDeferred = null;
          this.initializePromise = null;
          this.detectSessionInUrl = true;
          this.hasCustomAuthorizationHeader = false;
          this.suppressGetSessionWarning = false;
          this.lockAcquired = false;
          this.pendingInLock = [];
          this.broadcastChannel = null;
          this.logger = console.log;
          this.instanceID = _GoTrueClient.nextInstanceID;
          _GoTrueClient.nextInstanceID += 1;
          if (this.instanceID > 0 && isBrowser()) {
            console.warn("Multiple GoTrueClient instances detected in the same browser context. It is not an error, but this should be avoided as it may produce undefined behavior when used concurrently under the same storage key.");
          }
          const settings = Object.assign(Object.assign({}, DEFAULT_OPTIONS), options);
          this.logDebugMessages = !!settings.debug;
          if (typeof settings.debug === "function") {
            this.logger = settings.debug;
          }
          this.persistSession = settings.persistSession;
          this.storageKey = settings.storageKey;
          this.autoRefreshToken = settings.autoRefreshToken;
          this.admin = new GoTrueAdminApi({
            url: settings.url,
            headers: settings.headers,
            fetch: settings.fetch
          });
          this.url = settings.url;
          this.headers = settings.headers;
          this.fetch = resolveFetch4(settings.fetch);
          this.lock = settings.lock || lockNoOp;
          this.detectSessionInUrl = settings.detectSessionInUrl;
          this.flowType = settings.flowType;
          this.hasCustomAuthorizationHeader = settings.hasCustomAuthorizationHeader;
          if (settings.lock) {
            this.lock = settings.lock;
          } else if (isBrowser() && ((_a = globalThis === null || globalThis === void 0 ? void 0 : globalThis.navigator) === null || _a === void 0 ? void 0 : _a.locks)) {
            this.lock = navigatorLock;
          } else {
            this.lock = lockNoOp;
          }
          this.jwks = { keys: [] };
          this.jwks_cached_at = Number.MIN_SAFE_INTEGER;
          this.mfa = {
            verify: this._verify.bind(this),
            enroll: this._enroll.bind(this),
            unenroll: this._unenroll.bind(this),
            challenge: this._challenge.bind(this),
            listFactors: this._listFactors.bind(this),
            challengeAndVerify: this._challengeAndVerify.bind(this),
            getAuthenticatorAssuranceLevel: this._getAuthenticatorAssuranceLevel.bind(this)
          };
          if (this.persistSession) {
            if (settings.storage) {
              this.storage = settings.storage;
            } else {
              if (supportsLocalStorage()) {
                this.storage = localStorageAdapter;
              } else {
                this.memoryStorage = {};
                this.storage = memoryLocalStorageAdapter(this.memoryStorage);
              }
            }
          } else {
            this.memoryStorage = {};
            this.storage = memoryLocalStorageAdapter(this.memoryStorage);
          }
          if (isBrowser() && globalThis.BroadcastChannel && this.persistSession && this.storageKey) {
            try {
              this.broadcastChannel = new globalThis.BroadcastChannel(this.storageKey);
            } catch (e) {
              console.error("Failed to create a new BroadcastChannel, multi-tab state changes will not be available", e);
            }
            (_b = this.broadcastChannel) === null || _b === void 0 ? void 0 : _b.addEventListener("message", async (event) => {
              this._debug("received broadcast notification from other tab or client", event);
              await this._notifyAllSubscribers(event.data.event, event.data.session, false);
            });
          }
          this.initialize();
        }
        _debug(...args) {
          if (this.logDebugMessages) {
            this.logger(`GoTrueClient@${this.instanceID} (${version4}) ${(/* @__PURE__ */ new Date()).toISOString()}`, ...args);
          }
          return this;
        }
        /**
         * Initializes the client session either from the url or from storage.
         * This method is automatically called when instantiating the client, but should also be called
         * manually when checking for an error from an auth redirect (oauth, magiclink, password recovery, etc).
         */
        async initialize() {
          if (this.initializePromise) {
            return await this.initializePromise;
          }
          this.initializePromise = (async () => {
            return await this._acquireLock(-1, async () => {
              return await this._initialize();
            });
          })();
          return await this.initializePromise;
        }
        /**
         * IMPORTANT:
         * 1. Never throw in this method, as it is called from the constructor
         * 2. Never return a session from this method as it would be cached over
         *    the whole lifetime of the client
         */
        async _initialize() {
          var _a;
          try {
            const params = parseParametersFromURL(window.location.href);
            let callbackUrlType = "none";
            if (this._isImplicitGrantCallback(params)) {
              callbackUrlType = "implicit";
            } else if (await this._isPKCECallback(params)) {
              callbackUrlType = "pkce";
            }
            if (isBrowser() && this.detectSessionInUrl && callbackUrlType !== "none") {
              const { data, error } = await this._getSessionFromURL(params, callbackUrlType);
              if (error) {
                this._debug("#_initialize()", "error detecting session from URL", error);
                if (isAuthImplicitGrantRedirectError(error)) {
                  const errorCode = (_a = error.details) === null || _a === void 0 ? void 0 : _a.code;
                  if (errorCode === "identity_already_exists" || errorCode === "identity_not_found" || errorCode === "single_identity_not_deletable") {
                    return { error };
                  }
                }
                await this._removeSession();
                return { error };
              }
              const { session, redirectType } = data;
              this._debug("#_initialize()", "detected session in URL", session, "redirect type", redirectType);
              await this._saveSession(session);
              setTimeout(async () => {
                if (redirectType === "recovery") {
                  await this._notifyAllSubscribers("PASSWORD_RECOVERY", session);
                } else {
                  await this._notifyAllSubscribers("SIGNED_IN", session);
                }
              }, 0);
              return { error: null };
            }
            await this._recoverAndRefresh();
            return { error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { error };
            }
            return {
              error: new AuthUnknownError("Unexpected error during initialization", error)
            };
          } finally {
            await this._handleVisibilityChange();
            this._debug("#_initialize()", "end");
          }
        }
        /**
         * Creates a new anonymous user.
         *
         * @returns A session where the is_anonymous claim in the access token JWT set to true
         */
        async signInAnonymously(credentials) {
          var _a, _b, _c;
          try {
            const res = await _request(this.fetch, "POST", `${this.url}/signup`, {
              headers: this.headers,
              body: {
                data: (_b = (_a = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : {},
                gotrue_meta_security: { captcha_token: (_c = credentials === null || credentials === void 0 ? void 0 : credentials.options) === null || _c === void 0 ? void 0 : _c.captchaToken }
              },
              xform: _sessionResponse
            });
            const { data, error } = res;
            if (error || !data) {
              return { data: { user: null, session: null }, error };
            }
            const session = data.session;
            const user = data.user;
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", session);
            }
            return { data: { user, session }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Creates a new user.
         *
         * Be aware that if a user account exists in the system you may get back an
         * error message that attempts to hide this information from the user.
         * This method has support for PKCE via email signups. The PKCE flow cannot be used when autoconfirm is enabled.
         *
         * @returns A logged-in session if the server has "autoconfirm" ON
         * @returns A user if the server has "autoconfirm" OFF
         */
        async signUp(credentials) {
          var _a, _b, _c;
          try {
            let res;
            if ("email" in credentials) {
              const { email, password, options } = credentials;
              let codeChallenge = null;
              let codeChallengeMethod = null;
              if (this.flowType === "pkce") {
                ;
                [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
              }
              res = await _request(this.fetch, "POST", `${this.url}/signup`, {
                headers: this.headers,
                redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
                body: {
                  email,
                  password,
                  data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                  code_challenge: codeChallenge,
                  code_challenge_method: codeChallengeMethod
                },
                xform: _sessionResponse
              });
            } else if ("phone" in credentials) {
              const { phone, password, options } = credentials;
              res = await _request(this.fetch, "POST", `${this.url}/signup`, {
                headers: this.headers,
                body: {
                  phone,
                  password,
                  data: (_b = options === null || options === void 0 ? void 0 : options.data) !== null && _b !== void 0 ? _b : {},
                  channel: (_c = options === null || options === void 0 ? void 0 : options.channel) !== null && _c !== void 0 ? _c : "sms",
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
                },
                xform: _sessionResponse
              });
            } else {
              throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
            }
            const { data, error } = res;
            if (error || !data) {
              return { data: { user: null, session: null }, error };
            }
            const session = data.session;
            const user = data.user;
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", session);
            }
            return { data: { user, session }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Log in an existing user with an email and password or phone and password.
         *
         * Be aware that you may get back an error message that will not distinguish
         * between the cases where the account does not exist or that the
         * email/phone and password combination is wrong or that the account can only
         * be accessed via social login.
         */
        async signInWithPassword(credentials) {
          try {
            let res;
            if ("email" in credentials) {
              const { email, password, options } = credentials;
              res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
                headers: this.headers,
                body: {
                  email,
                  password,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
                },
                xform: _sessionResponsePassword
              });
            } else if ("phone" in credentials) {
              const { phone, password, options } = credentials;
              res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=password`, {
                headers: this.headers,
                body: {
                  phone,
                  password,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
                },
                xform: _sessionResponsePassword
              });
            } else {
              throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a password");
            }
            const { data, error } = res;
            if (error) {
              return { data: { user: null, session: null }, error };
            } else if (!data || !data.session || !data.user) {
              return { data: { user: null, session: null }, error: new AuthInvalidTokenResponseError() };
            }
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", data.session);
            }
            return {
              data: Object.assign({ user: data.user, session: data.session }, data.weak_password ? { weakPassword: data.weak_password } : null),
              error
            };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Log in an existing user via a third-party provider.
         * This method supports the PKCE flow.
         */
        async signInWithOAuth(credentials) {
          var _a, _b, _c, _d;
          return await this._handleProviderSignIn(credentials.provider, {
            redirectTo: (_a = credentials.options) === null || _a === void 0 ? void 0 : _a.redirectTo,
            scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
            queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
            skipBrowserRedirect: (_d = credentials.options) === null || _d === void 0 ? void 0 : _d.skipBrowserRedirect
          });
        }
        /**
         * Log in an existing user by exchanging an Auth Code issued during the PKCE flow.
         */
        async exchangeCodeForSession(authCode) {
          await this.initializePromise;
          return this._acquireLock(-1, async () => {
            return this._exchangeCodeForSession(authCode);
          });
        }
        /**
         * Signs in a user by verifying a message signed by the user's private key.
         * Only Solana supported at this time, using the Sign in with Solana standard.
         */
        async signInWithWeb3(credentials) {
          const { chain } = credentials;
          if (chain === "solana") {
            return await this.signInWithSolana(credentials);
          }
          throw new Error(`@supabase/auth-js: Unsupported chain "${chain}"`);
        }
        async signInWithSolana(credentials) {
          var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m;
          let message;
          let signature;
          if ("message" in credentials) {
            message = credentials.message;
            signature = credentials.signature;
          } else {
            const { chain, wallet, statement, options } = credentials;
            let resolvedWallet;
            if (!isBrowser()) {
              if (typeof wallet !== "object" || !(options === null || options === void 0 ? void 0 : options.url)) {
                throw new Error("@supabase/auth-js: Both wallet and url must be specified in non-browser environments.");
              }
              resolvedWallet = wallet;
            } else if (typeof wallet === "object") {
              resolvedWallet = wallet;
            } else {
              const windowAny = window;
              if ("solana" in windowAny && typeof windowAny.solana === "object" && ("signIn" in windowAny.solana && typeof windowAny.solana.signIn === "function" || "signMessage" in windowAny.solana && typeof windowAny.solana.signMessage === "function")) {
                resolvedWallet = windowAny.solana;
              } else {
                throw new Error(`@supabase/auth-js: No compatible Solana wallet interface on the window object (window.solana) detected. Make sure the user already has a wallet installed and connected for this app. Prefer passing the wallet interface object directly to signInWithWeb3({ chain: 'solana', wallet: resolvedUserWallet }) instead.`);
              }
            }
            const url = new URL((_a = options === null || options === void 0 ? void 0 : options.url) !== null && _a !== void 0 ? _a : window.location.href);
            if ("signIn" in resolvedWallet && resolvedWallet.signIn) {
              const output = await resolvedWallet.signIn(Object.assign(Object.assign(Object.assign({ issuedAt: (/* @__PURE__ */ new Date()).toISOString() }, options === null || options === void 0 ? void 0 : options.signInWithSolana), {
                // non-overridable properties
                version: "1",
                domain: url.host,
                uri: url.href
              }), statement ? { statement } : null));
              let outputToProcess;
              if (Array.isArray(output) && output[0] && typeof output[0] === "object") {
                outputToProcess = output[0];
              } else if (output && typeof output === "object" && "signedMessage" in output && "signature" in output) {
                outputToProcess = output;
              } else {
                throw new Error("@supabase/auth-js: Wallet method signIn() returned unrecognized value");
              }
              if ("signedMessage" in outputToProcess && "signature" in outputToProcess && (typeof outputToProcess.signedMessage === "string" || outputToProcess.signedMessage instanceof Uint8Array) && outputToProcess.signature instanceof Uint8Array) {
                message = typeof outputToProcess.signedMessage === "string" ? outputToProcess.signedMessage : new TextDecoder().decode(outputToProcess.signedMessage);
                signature = outputToProcess.signature;
              } else {
                throw new Error("@supabase/auth-js: Wallet method signIn() API returned object without signedMessage and signature fields");
              }
            } else {
              if (!("signMessage" in resolvedWallet) || typeof resolvedWallet.signMessage !== "function" || !("publicKey" in resolvedWallet) || typeof resolvedWallet !== "object" || !resolvedWallet.publicKey || !("toBase58" in resolvedWallet.publicKey) || typeof resolvedWallet.publicKey.toBase58 !== "function") {
                throw new Error("@supabase/auth-js: Wallet does not have a compatible signMessage() and publicKey.toBase58() API");
              }
              message = [
                `${url.host} wants you to sign in with your Solana account:`,
                resolvedWallet.publicKey.toBase58(),
                ...statement ? ["", statement, ""] : [""],
                "Version: 1",
                `URI: ${url.href}`,
                `Issued At: ${(_c = (_b = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _b === void 0 ? void 0 : _b.issuedAt) !== null && _c !== void 0 ? _c : (/* @__PURE__ */ new Date()).toISOString()}`,
                ...((_d = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _d === void 0 ? void 0 : _d.notBefore) ? [`Not Before: ${options.signInWithSolana.notBefore}`] : [],
                ...((_e = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _e === void 0 ? void 0 : _e.expirationTime) ? [`Expiration Time: ${options.signInWithSolana.expirationTime}`] : [],
                ...((_f = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _f === void 0 ? void 0 : _f.chainId) ? [`Chain ID: ${options.signInWithSolana.chainId}`] : [],
                ...((_g = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _g === void 0 ? void 0 : _g.nonce) ? [`Nonce: ${options.signInWithSolana.nonce}`] : [],
                ...((_h = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _h === void 0 ? void 0 : _h.requestId) ? [`Request ID: ${options.signInWithSolana.requestId}`] : [],
                ...((_k = (_j = options === null || options === void 0 ? void 0 : options.signInWithSolana) === null || _j === void 0 ? void 0 : _j.resources) === null || _k === void 0 ? void 0 : _k.length) ? [
                  "Resources",
                  ...options.signInWithSolana.resources.map((resource) => `- ${resource}`)
                ] : []
              ].join("\n");
              const maybeSignature = await resolvedWallet.signMessage(new TextEncoder().encode(message), "utf8");
              if (!maybeSignature || !(maybeSignature instanceof Uint8Array)) {
                throw new Error("@supabase/auth-js: Wallet signMessage() API returned an recognized value");
              }
              signature = maybeSignature;
            }
          }
          try {
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=web3`, {
              headers: this.headers,
              body: Object.assign({ chain: "solana", message, signature: bytesToBase64URL(signature) }, ((_l = credentials.options) === null || _l === void 0 ? void 0 : _l.captchaToken) ? { gotrue_meta_security: { captcha_token: (_m = credentials.options) === null || _m === void 0 ? void 0 : _m.captchaToken } } : null),
              xform: _sessionResponse
            });
            if (error) {
              throw error;
            }
            if (!data || !data.session || !data.user) {
              return {
                data: { user: null, session: null },
                error: new AuthInvalidTokenResponseError()
              };
            }
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", data.session);
            }
            return { data: Object.assign({}, data), error };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        async _exchangeCodeForSession(authCode) {
          const storageItem = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          const [codeVerifier, redirectType] = (storageItem !== null && storageItem !== void 0 ? storageItem : "").split("/");
          try {
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/token?grant_type=pkce`, {
              headers: this.headers,
              body: {
                auth_code: authCode,
                code_verifier: codeVerifier
              },
              xform: _sessionResponse
            });
            await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
            if (error) {
              throw error;
            }
            if (!data || !data.session || !data.user) {
              return {
                data: { user: null, session: null, redirectType: null },
                error: new AuthInvalidTokenResponseError()
              };
            }
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", data.session);
            }
            return { data: Object.assign(Object.assign({}, data), { redirectType: redirectType !== null && redirectType !== void 0 ? redirectType : null }), error };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null, redirectType: null }, error };
            }
            throw error;
          }
        }
        /**
         * Allows signing in with an OIDC ID token. The authentication provider used
         * should be enabled and configured.
         */
        async signInWithIdToken(credentials) {
          try {
            const { options, provider, token, access_token, nonce } = credentials;
            const res = await _request(this.fetch, "POST", `${this.url}/token?grant_type=id_token`, {
              headers: this.headers,
              body: {
                provider,
                id_token: token,
                access_token,
                nonce,
                gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
              },
              xform: _sessionResponse
            });
            const { data, error } = res;
            if (error) {
              return { data: { user: null, session: null }, error };
            } else if (!data || !data.session || !data.user) {
              return {
                data: { user: null, session: null },
                error: new AuthInvalidTokenResponseError()
              };
            }
            if (data.session) {
              await this._saveSession(data.session);
              await this._notifyAllSubscribers("SIGNED_IN", data.session);
            }
            return { data, error };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Log in a user using magiclink or a one-time password (OTP).
         *
         * If the `{{ .ConfirmationURL }}` variable is specified in the email template, a magiclink will be sent.
         * If the `{{ .Token }}` variable is specified in the email template, an OTP will be sent.
         * If you're using phone sign-ins, only an OTP will be sent. You won't be able to send a magiclink for phone sign-ins.
         *
         * Be aware that you may get back an error message that will not distinguish
         * between the cases where the account does not exist or, that the account
         * can only be accessed via social login.
         *
         * Do note that you will need to configure a Whatsapp sender on Twilio
         * if you are using phone sign in with the 'whatsapp' channel. The whatsapp
         * channel is not supported on other providers
         * at this time.
         * This method supports PKCE when an email is passed.
         */
        async signInWithOtp(credentials) {
          var _a, _b, _c, _d, _e;
          try {
            if ("email" in credentials) {
              const { email, options } = credentials;
              let codeChallenge = null;
              let codeChallengeMethod = null;
              if (this.flowType === "pkce") {
                ;
                [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
              }
              const { error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
                headers: this.headers,
                body: {
                  email,
                  data: (_a = options === null || options === void 0 ? void 0 : options.data) !== null && _a !== void 0 ? _a : {},
                  create_user: (_b = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _b !== void 0 ? _b : true,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                  code_challenge: codeChallenge,
                  code_challenge_method: codeChallengeMethod
                },
                redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
              });
              return { data: { user: null, session: null }, error };
            }
            if ("phone" in credentials) {
              const { phone, options } = credentials;
              const { data, error } = await _request(this.fetch, "POST", `${this.url}/otp`, {
                headers: this.headers,
                body: {
                  phone,
                  data: (_c = options === null || options === void 0 ? void 0 : options.data) !== null && _c !== void 0 ? _c : {},
                  create_user: (_d = options === null || options === void 0 ? void 0 : options.shouldCreateUser) !== null && _d !== void 0 ? _d : true,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken },
                  channel: (_e = options === null || options === void 0 ? void 0 : options.channel) !== null && _e !== void 0 ? _e : "sms"
                }
              });
              return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
            }
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number.");
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Log in a user given a User supplied OTP or TokenHash received through mobile or email.
         */
        async verifyOtp(params) {
          var _a, _b;
          try {
            let redirectTo = void 0;
            let captchaToken = void 0;
            if ("options" in params) {
              redirectTo = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo;
              captchaToken = (_b = params.options) === null || _b === void 0 ? void 0 : _b.captchaToken;
            }
            const { data, error } = await _request(this.fetch, "POST", `${this.url}/verify`, {
              headers: this.headers,
              body: Object.assign(Object.assign({}, params), { gotrue_meta_security: { captcha_token: captchaToken } }),
              redirectTo,
              xform: _sessionResponse
            });
            if (error) {
              throw error;
            }
            if (!data) {
              throw new Error("An error occurred on token verification.");
            }
            const session = data.session;
            const user = data.user;
            if (session === null || session === void 0 ? void 0 : session.access_token) {
              await this._saveSession(session);
              await this._notifyAllSubscribers(params.type == "recovery" ? "PASSWORD_RECOVERY" : "SIGNED_IN", session);
            }
            return { data: { user, session }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Attempts a single-sign on using an enterprise Identity Provider. A
         * successful SSO attempt will redirect the current page to the identity
         * provider authorization page. The redirect URL is implementation and SSO
         * protocol specific.
         *
         * You can use it by providing a SSO domain. Typically you can extract this
         * domain by asking users for their email address. If this domain is
         * registered on the Auth instance the redirect will use that organization's
         * currently active SSO Identity Provider for the login.
         *
         * If you have built an organization-specific login page, you can use the
         * organization's SSO Identity Provider UUID directly instead.
         */
        async signInWithSSO(params) {
          var _a, _b, _c;
          try {
            let codeChallenge = null;
            let codeChallengeMethod = null;
            if (this.flowType === "pkce") {
              ;
              [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            }
            return await _request(this.fetch, "POST", `${this.url}/sso`, {
              body: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, "providerId" in params ? { provider_id: params.providerId } : null), "domain" in params ? { domain: params.domain } : null), { redirect_to: (_b = (_a = params.options) === null || _a === void 0 ? void 0 : _a.redirectTo) !== null && _b !== void 0 ? _b : void 0 }), ((_c = params === null || params === void 0 ? void 0 : params.options) === null || _c === void 0 ? void 0 : _c.captchaToken) ? { gotrue_meta_security: { captcha_token: params.options.captchaToken } } : null), { skip_http_redirect: true, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
              headers: this.headers,
              xform: _ssoResponse
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * Sends a reauthentication OTP to the user's email or phone number.
         * Requires the user to be signed-in.
         */
        async reauthenticate() {
          await this.initializePromise;
          return await this._acquireLock(-1, async () => {
            return await this._reauthenticate();
          });
        }
        async _reauthenticate() {
          try {
            return await this._useSession(async (result) => {
              const { data: { session }, error: sessionError } = result;
              if (sessionError)
                throw sessionError;
              if (!session)
                throw new AuthSessionMissingError();
              const { error } = await _request(this.fetch, "GET", `${this.url}/reauthenticate`, {
                headers: this.headers,
                jwt: session.access_token
              });
              return { data: { user: null, session: null }, error };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Resends an existing signup confirmation email, email change email, SMS OTP or phone change OTP.
         */
        async resend(credentials) {
          try {
            const endpoint = `${this.url}/resend`;
            if ("email" in credentials) {
              const { email, type, options } = credentials;
              const { error } = await _request(this.fetch, "POST", endpoint, {
                headers: this.headers,
                body: {
                  email,
                  type,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
                },
                redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo
              });
              return { data: { user: null, session: null }, error };
            } else if ("phone" in credentials) {
              const { phone, type, options } = credentials;
              const { data, error } = await _request(this.fetch, "POST", endpoint, {
                headers: this.headers,
                body: {
                  phone,
                  type,
                  gotrue_meta_security: { captcha_token: options === null || options === void 0 ? void 0 : options.captchaToken }
                }
              });
              return { data: { user: null, session: null, messageId: data === null || data === void 0 ? void 0 : data.message_id }, error };
            }
            throw new AuthInvalidCredentialsError("You must provide either an email or phone number and a type");
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Returns the session, refreshing it if necessary.
         *
         * The session returned can be null if the session is not detected which can happen in the event a user is not signed-in or has logged out.
         *
         * **IMPORTANT:** This method loads values directly from the storage attached
         * to the client. If that storage is based on request cookies for example,
         * the values in it may not be authentic and therefore it's strongly advised
         * against using this method and its results in such circumstances. A warning
         * will be emitted if this is detected. Use {@link #getUser()} instead.
         */
        async getSession() {
          await this.initializePromise;
          const result = await this._acquireLock(-1, async () => {
            return this._useSession(async (result2) => {
              return result2;
            });
          });
          return result;
        }
        /**
         * Acquires a global lock based on the storage key.
         */
        async _acquireLock(acquireTimeout, fn) {
          this._debug("#_acquireLock", "begin", acquireTimeout);
          try {
            if (this.lockAcquired) {
              const last = this.pendingInLock.length ? this.pendingInLock[this.pendingInLock.length - 1] : Promise.resolve();
              const result = (async () => {
                await last;
                return await fn();
              })();
              this.pendingInLock.push((async () => {
                try {
                  await result;
                } catch (e) {
                }
              })());
              return result;
            }
            return await this.lock(`lock:${this.storageKey}`, acquireTimeout, async () => {
              this._debug("#_acquireLock", "lock acquired for storage key", this.storageKey);
              try {
                this.lockAcquired = true;
                const result = fn();
                this.pendingInLock.push((async () => {
                  try {
                    await result;
                  } catch (e) {
                  }
                })());
                await result;
                while (this.pendingInLock.length) {
                  const waitOn = [...this.pendingInLock];
                  await Promise.all(waitOn);
                  this.pendingInLock.splice(0, waitOn.length);
                }
                return await result;
              } finally {
                this._debug("#_acquireLock", "lock released for storage key", this.storageKey);
                this.lockAcquired = false;
              }
            });
          } finally {
            this._debug("#_acquireLock", "end");
          }
        }
        /**
         * Use instead of {@link #getSession} inside the library. It is
         * semantically usually what you want, as getting a session involves some
         * processing afterwards that requires only one client operating on the
         * session at once across multiple tabs or processes.
         */
        async _useSession(fn) {
          this._debug("#_useSession", "begin");
          try {
            const result = await this.__loadSession();
            return await fn(result);
          } finally {
            this._debug("#_useSession", "end");
          }
        }
        /**
         * NEVER USE DIRECTLY!
         *
         * Always use {@link #_useSession}.
         */
        async __loadSession() {
          this._debug("#__loadSession()", "begin");
          if (!this.lockAcquired) {
            this._debug("#__loadSession()", "used outside of an acquired lock!", new Error().stack);
          }
          try {
            let currentSession = null;
            const maybeSession = await getItemAsync(this.storage, this.storageKey);
            this._debug("#getSession()", "session from storage", maybeSession);
            if (maybeSession !== null) {
              if (this._isValidSession(maybeSession)) {
                currentSession = maybeSession;
              } else {
                this._debug("#getSession()", "session from storage is not valid");
                await this._removeSession();
              }
            }
            if (!currentSession) {
              return { data: { session: null }, error: null };
            }
            const hasExpired = currentSession.expires_at ? currentSession.expires_at * 1e3 - Date.now() < EXPIRY_MARGIN_MS : false;
            this._debug("#__loadSession()", `session has${hasExpired ? "" : " not"} expired`, "expires_at", currentSession.expires_at);
            if (!hasExpired) {
              if (this.storage.isServer) {
                let suppressWarning = this.suppressGetSessionWarning;
                const proxySession = new Proxy(currentSession, {
                  get: (target, prop, receiver) => {
                    if (!suppressWarning && prop === "user") {
                      console.warn("Using the user object as returned from supabase.auth.getSession() or from some supabase.auth.onAuthStateChange() events could be insecure! This value comes directly from the storage medium (usually cookies on the server) and may not be authentic. Use supabase.auth.getUser() instead which authenticates the data by contacting the Supabase Auth server.");
                      suppressWarning = true;
                      this.suppressGetSessionWarning = true;
                    }
                    return Reflect.get(target, prop, receiver);
                  }
                });
                currentSession = proxySession;
              }
              return { data: { session: currentSession }, error: null };
            }
            const { session, error } = await this._callRefreshToken(currentSession.refresh_token);
            if (error) {
              return { data: { session: null }, error };
            }
            return { data: { session }, error: null };
          } finally {
            this._debug("#__loadSession()", "end");
          }
        }
        /**
         * Gets the current user details if there is an existing session. This method
         * performs a network request to the Supabase Auth server, so the returned
         * value is authentic and can be used to base authorization rules on.
         *
         * @param jwt Takes in an optional access token JWT. If no JWT is provided, the JWT from the current session is used.
         */
        async getUser(jwt) {
          if (jwt) {
            return await this._getUser(jwt);
          }
          await this.initializePromise;
          const result = await this._acquireLock(-1, async () => {
            return await this._getUser();
          });
          return result;
        }
        async _getUser(jwt) {
          try {
            if (jwt) {
              return await _request(this.fetch, "GET", `${this.url}/user`, {
                headers: this.headers,
                jwt,
                xform: _userResponse
              });
            }
            return await this._useSession(async (result) => {
              var _a, _b, _c;
              const { data, error } = result;
              if (error) {
                throw error;
              }
              if (!((_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) && !this.hasCustomAuthorizationHeader) {
                return { data: { user: null }, error: new AuthSessionMissingError() };
              }
              return await _request(this.fetch, "GET", `${this.url}/user`, {
                headers: this.headers,
                jwt: (_c = (_b = data.session) === null || _b === void 0 ? void 0 : _b.access_token) !== null && _c !== void 0 ? _c : void 0,
                xform: _userResponse
              });
            });
          } catch (error) {
            if (isAuthError(error)) {
              if (isAuthSessionMissingError(error)) {
                await this._removeSession();
                await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
              }
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Updates user data for a logged in user.
         */
        async updateUser(attributes, options = {}) {
          await this.initializePromise;
          return await this._acquireLock(-1, async () => {
            return await this._updateUser(attributes, options);
          });
        }
        async _updateUser(attributes, options = {}) {
          try {
            return await this._useSession(async (result) => {
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                throw sessionError;
              }
              if (!sessionData.session) {
                throw new AuthSessionMissingError();
              }
              const session = sessionData.session;
              let codeChallenge = null;
              let codeChallengeMethod = null;
              if (this.flowType === "pkce" && attributes.email != null) {
                ;
                [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
              }
              const { data, error: userError } = await _request(this.fetch, "PUT", `${this.url}/user`, {
                headers: this.headers,
                redirectTo: options === null || options === void 0 ? void 0 : options.emailRedirectTo,
                body: Object.assign(Object.assign({}, attributes), { code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod }),
                jwt: session.access_token,
                xform: _userResponse
              });
              if (userError)
                throw userError;
              session.user = data.user;
              await this._saveSession(session);
              await this._notifyAllSubscribers("USER_UPDATED", session);
              return { data: { user: session.user }, error: null };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Sets the session data from the current session. If the current session is expired, setSession will take care of refreshing it to obtain a new session.
         * If the refresh token or access token in the current session is invalid, an error will be thrown.
         * @param currentSession The current session that minimally contains an access token and refresh token.
         */
        async setSession(currentSession) {
          await this.initializePromise;
          return await this._acquireLock(-1, async () => {
            return await this._setSession(currentSession);
          });
        }
        async _setSession(currentSession) {
          try {
            if (!currentSession.access_token || !currentSession.refresh_token) {
              throw new AuthSessionMissingError();
            }
            const timeNow = Date.now() / 1e3;
            let expiresAt2 = timeNow;
            let hasExpired = true;
            let session = null;
            const { payload } = decodeJWT(currentSession.access_token);
            if (payload.exp) {
              expiresAt2 = payload.exp;
              hasExpired = expiresAt2 <= timeNow;
            }
            if (hasExpired) {
              const { session: refreshedSession, error } = await this._callRefreshToken(currentSession.refresh_token);
              if (error) {
                return { data: { user: null, session: null }, error };
              }
              if (!refreshedSession) {
                return { data: { user: null, session: null }, error: null };
              }
              session = refreshedSession;
            } else {
              const { data, error } = await this._getUser(currentSession.access_token);
              if (error) {
                throw error;
              }
              session = {
                access_token: currentSession.access_token,
                refresh_token: currentSession.refresh_token,
                user: data.user,
                token_type: "bearer",
                expires_in: expiresAt2 - timeNow,
                expires_at: expiresAt2
              };
              await this._saveSession(session);
              await this._notifyAllSubscribers("SIGNED_IN", session);
            }
            return { data: { user: session.user, session }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { session: null, user: null }, error };
            }
            throw error;
          }
        }
        /**
         * Returns a new session, regardless of expiry status.
         * Takes in an optional current session. If not passed in, then refreshSession() will attempt to retrieve it from getSession().
         * If the current session's refresh token is invalid, an error will be thrown.
         * @param currentSession The current session. If passed in, it must contain a refresh token.
         */
        async refreshSession(currentSession) {
          await this.initializePromise;
          return await this._acquireLock(-1, async () => {
            return await this._refreshSession(currentSession);
          });
        }
        async _refreshSession(currentSession) {
          try {
            return await this._useSession(async (result) => {
              var _a;
              if (!currentSession) {
                const { data, error: error2 } = result;
                if (error2) {
                  throw error2;
                }
                currentSession = (_a = data.session) !== null && _a !== void 0 ? _a : void 0;
              }
              if (!(currentSession === null || currentSession === void 0 ? void 0 : currentSession.refresh_token)) {
                throw new AuthSessionMissingError();
              }
              const { session, error } = await this._callRefreshToken(currentSession.refresh_token);
              if (error) {
                return { data: { user: null, session: null }, error };
              }
              if (!session) {
                return { data: { user: null, session: null }, error: null };
              }
              return { data: { user: session.user, session }, error: null };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { user: null, session: null }, error };
            }
            throw error;
          }
        }
        /**
         * Gets the session data from a URL string
         */
        async _getSessionFromURL(params, callbackUrlType) {
          try {
            if (!isBrowser())
              throw new AuthImplicitGrantRedirectError("No browser detected.");
            if (params.error || params.error_description || params.error_code) {
              throw new AuthImplicitGrantRedirectError(params.error_description || "Error in URL with unspecified error_description", {
                error: params.error || "unspecified_error",
                code: params.error_code || "unspecified_code"
              });
            }
            switch (callbackUrlType) {
              case "implicit":
                if (this.flowType === "pkce") {
                  throw new AuthPKCEGrantCodeExchangeError("Not a valid PKCE flow url.");
                }
                break;
              case "pkce":
                if (this.flowType === "implicit") {
                  throw new AuthImplicitGrantRedirectError("Not a valid implicit grant flow url.");
                }
                break;
              default:
            }
            if (callbackUrlType === "pkce") {
              this._debug("#_initialize()", "begin", "is PKCE flow", true);
              if (!params.code)
                throw new AuthPKCEGrantCodeExchangeError("No code detected.");
              const { data: data2, error: error2 } = await this._exchangeCodeForSession(params.code);
              if (error2)
                throw error2;
              const url = new URL(window.location.href);
              url.searchParams.delete("code");
              window.history.replaceState(window.history.state, "", url.toString());
              return { data: { session: data2.session, redirectType: null }, error: null };
            }
            const { provider_token, provider_refresh_token, access_token, refresh_token, expires_in, expires_at, token_type } = params;
            if (!access_token || !expires_in || !refresh_token || !token_type) {
              throw new AuthImplicitGrantRedirectError("No session defined in URL");
            }
            const timeNow = Math.round(Date.now() / 1e3);
            const expiresIn = parseInt(expires_in);
            let expiresAt2 = timeNow + expiresIn;
            if (expires_at) {
              expiresAt2 = parseInt(expires_at);
            }
            const actuallyExpiresIn = expiresAt2 - timeNow;
            if (actuallyExpiresIn * 1e3 <= AUTO_REFRESH_TICK_DURATION_MS) {
              console.warn(`@supabase/gotrue-js: Session as retrieved from URL expires in ${actuallyExpiresIn}s, should have been closer to ${expiresIn}s`);
            }
            const issuedAt = expiresAt2 - expiresIn;
            if (timeNow - issuedAt >= 120) {
              console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued over 120s ago, URL could be stale", issuedAt, expiresAt2, timeNow);
            } else if (timeNow - issuedAt < 0) {
              console.warn("@supabase/gotrue-js: Session as retrieved from URL was issued in the future? Check the device clock for skew", issuedAt, expiresAt2, timeNow);
            }
            const { data, error } = await this._getUser(access_token);
            if (error)
              throw error;
            const session = {
              provider_token,
              provider_refresh_token,
              access_token,
              expires_in: expiresIn,
              expires_at: expiresAt2,
              refresh_token,
              token_type,
              user: data.user
            };
            window.location.hash = "";
            this._debug("#_getSessionFromURL()", "clearing window.location.hash");
            return { data: { session, redirectType: params.type }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { session: null, redirectType: null }, error };
            }
            throw error;
          }
        }
        /**
         * Checks if the current URL contains parameters given by an implicit oauth grant flow (https://www.rfc-editor.org/rfc/rfc6749.html#section-4.2)
         */
        _isImplicitGrantCallback(params) {
          return Boolean(params.access_token || params.error_description);
        }
        /**
         * Checks if the current URL and backing storage contain parameters given by a PKCE flow
         */
        async _isPKCECallback(params) {
          const currentStorageContent = await getItemAsync(this.storage, `${this.storageKey}-code-verifier`);
          return !!(params.code && currentStorageContent);
        }
        /**
         * Inside a browser context, `signOut()` will remove the logged in user from the browser session and log them out - removing all items from localstorage and then trigger a `"SIGNED_OUT"` event.
         *
         * For server-side management, you can revoke all refresh tokens for a user by passing a user's JWT through to `auth.api.signOut(JWT: string)`.
         * There is no way to revoke a user's access token jwt until it expires. It is recommended to set a shorter expiry on the jwt for this reason.
         *
         * If using `others` scope, no `SIGNED_OUT` event is fired!
         */
        async signOut(options = { scope: "global" }) {
          await this.initializePromise;
          return await this._acquireLock(-1, async () => {
            return await this._signOut(options);
          });
        }
        async _signOut({ scope } = { scope: "global" }) {
          return await this._useSession(async (result) => {
            var _a;
            const { data, error: sessionError } = result;
            if (sessionError) {
              return { error: sessionError };
            }
            const accessToken = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token;
            if (accessToken) {
              const { error } = await this.admin.signOut(accessToken, scope);
              if (error) {
                if (!(isAuthApiError(error) && (error.status === 404 || error.status === 401 || error.status === 403))) {
                  return { error };
                }
              }
            }
            if (scope !== "others") {
              await this._removeSession();
              await removeItemAsync(this.storage, `${this.storageKey}-code-verifier`);
            }
            return { error: null };
          });
        }
        /**
         * Receive a notification every time an auth event happens.
         * @param callback A callback function to be invoked when an auth event happens.
         */
        onAuthStateChange(callback) {
          const id = uuid();
          const subscription = {
            id,
            callback,
            unsubscribe: () => {
              this._debug("#unsubscribe()", "state change callback with id removed", id);
              this.stateChangeEmitters.delete(id);
            }
          };
          this._debug("#onAuthStateChange()", "registered callback with id", id);
          this.stateChangeEmitters.set(id, subscription);
          (async () => {
            await this.initializePromise;
            await this._acquireLock(-1, async () => {
              this._emitInitialSession(id);
            });
          })();
          return { data: { subscription } };
        }
        async _emitInitialSession(id) {
          return await this._useSession(async (result) => {
            var _a, _b;
            try {
              const { data: { session }, error } = result;
              if (error)
                throw error;
              await ((_a = this.stateChangeEmitters.get(id)) === null || _a === void 0 ? void 0 : _a.callback("INITIAL_SESSION", session));
              this._debug("INITIAL_SESSION", "callback id", id, "session", session);
            } catch (err) {
              await ((_b = this.stateChangeEmitters.get(id)) === null || _b === void 0 ? void 0 : _b.callback("INITIAL_SESSION", null));
              this._debug("INITIAL_SESSION", "callback id", id, "error", err);
              console.error(err);
            }
          });
        }
        /**
         * Sends a password reset request to an email address. This method supports the PKCE flow.
         *
         * @param email The email address of the user.
         * @param options.redirectTo The URL to send the user to after they click the password reset link.
         * @param options.captchaToken Verification token received when the user completes the captcha on the site.
         */
        async resetPasswordForEmail(email, options = {}) {
          let codeChallenge = null;
          let codeChallengeMethod = null;
          if (this.flowType === "pkce") {
            ;
            [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(
              this.storage,
              this.storageKey,
              true
              // isPasswordRecovery
            );
          }
          try {
            return await _request(this.fetch, "POST", `${this.url}/recover`, {
              body: {
                email,
                code_challenge: codeChallenge,
                code_challenge_method: codeChallengeMethod,
                gotrue_meta_security: { captcha_token: options.captchaToken }
              },
              headers: this.headers,
              redirectTo: options.redirectTo
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * Gets all the identities linked to a user.
         */
        async getUserIdentities() {
          var _a;
          try {
            const { data, error } = await this.getUser();
            if (error)
              throw error;
            return { data: { identities: (_a = data.user.identities) !== null && _a !== void 0 ? _a : [] }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * Links an oauth identity to an existing user.
         * This method supports the PKCE flow.
         */
        async linkIdentity(credentials) {
          var _a;
          try {
            const { data, error } = await this._useSession(async (result) => {
              var _a2, _b, _c, _d, _e;
              const { data: data2, error: error2 } = result;
              if (error2)
                throw error2;
              const url = await this._getUrlForProvider(`${this.url}/user/identities/authorize`, credentials.provider, {
                redirectTo: (_a2 = credentials.options) === null || _a2 === void 0 ? void 0 : _a2.redirectTo,
                scopes: (_b = credentials.options) === null || _b === void 0 ? void 0 : _b.scopes,
                queryParams: (_c = credentials.options) === null || _c === void 0 ? void 0 : _c.queryParams,
                skipBrowserRedirect: true
              });
              return await _request(this.fetch, "GET", url, {
                headers: this.headers,
                jwt: (_e = (_d = data2.session) === null || _d === void 0 ? void 0 : _d.access_token) !== null && _e !== void 0 ? _e : void 0
              });
            });
            if (error)
              throw error;
            if (isBrowser() && !((_a = credentials.options) === null || _a === void 0 ? void 0 : _a.skipBrowserRedirect)) {
              window.location.assign(data === null || data === void 0 ? void 0 : data.url);
            }
            return { data: { provider: credentials.provider, url: data === null || data === void 0 ? void 0 : data.url }, error: null };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: { provider: credentials.provider, url: null }, error };
            }
            throw error;
          }
        }
        /**
         * Unlinks an identity from a user by deleting it. The user will no longer be able to sign in with that identity once it's unlinked.
         */
        async unlinkIdentity(identity) {
          try {
            return await this._useSession(async (result) => {
              var _a, _b;
              const { data, error } = result;
              if (error) {
                throw error;
              }
              return await _request(this.fetch, "DELETE", `${this.url}/user/identities/${identity.identity_id}`, {
                headers: this.headers,
                jwt: (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : void 0
              });
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * Generates a new JWT.
         * @param refreshToken A valid refresh token that was returned on login.
         */
        async _refreshAccessToken(refreshToken) {
          const debugName = `#_refreshAccessToken(${refreshToken.substring(0, 5)}...)`;
          this._debug(debugName, "begin");
          try {
            const startedAt = Date.now();
            return await retryable(async (attempt) => {
              if (attempt > 0) {
                await sleep(200 * Math.pow(2, attempt - 1));
              }
              this._debug(debugName, "refreshing attempt", attempt);
              return await _request(this.fetch, "POST", `${this.url}/token?grant_type=refresh_token`, {
                body: { refresh_token: refreshToken },
                headers: this.headers,
                xform: _sessionResponse
              });
            }, (attempt, error) => {
              const nextBackOffInterval = 200 * Math.pow(2, attempt);
              return error && isAuthRetryableFetchError(error) && // retryable only if the request can be sent before the backoff overflows the tick duration
              Date.now() + nextBackOffInterval - startedAt < AUTO_REFRESH_TICK_DURATION_MS;
            });
          } catch (error) {
            this._debug(debugName, "error", error);
            if (isAuthError(error)) {
              return { data: { session: null, user: null }, error };
            }
            throw error;
          } finally {
            this._debug(debugName, "end");
          }
        }
        _isValidSession(maybeSession) {
          const isValidSession = typeof maybeSession === "object" && maybeSession !== null && "access_token" in maybeSession && "refresh_token" in maybeSession && "expires_at" in maybeSession;
          return isValidSession;
        }
        async _handleProviderSignIn(provider, options) {
          const url = await this._getUrlForProvider(`${this.url}/authorize`, provider, {
            redirectTo: options.redirectTo,
            scopes: options.scopes,
            queryParams: options.queryParams
          });
          this._debug("#_handleProviderSignIn()", "provider", provider, "options", options, "url", url);
          if (isBrowser() && !options.skipBrowserRedirect) {
            window.location.assign(url);
          }
          return { data: { provider, url }, error: null };
        }
        /**
         * Recovers the session from LocalStorage and refreshes the token
         * Note: this method is async to accommodate for AsyncStorage e.g. in React native.
         */
        async _recoverAndRefresh() {
          var _a;
          const debugName = "#_recoverAndRefresh()";
          this._debug(debugName, "begin");
          try {
            const currentSession = await getItemAsync(this.storage, this.storageKey);
            this._debug(debugName, "session from storage", currentSession);
            if (!this._isValidSession(currentSession)) {
              this._debug(debugName, "session is not valid");
              if (currentSession !== null) {
                await this._removeSession();
              }
              return;
            }
            const expiresWithMargin = ((_a = currentSession.expires_at) !== null && _a !== void 0 ? _a : Infinity) * 1e3 - Date.now() < EXPIRY_MARGIN_MS;
            this._debug(debugName, `session has${expiresWithMargin ? "" : " not"} expired with margin of ${EXPIRY_MARGIN_MS}s`);
            if (expiresWithMargin) {
              if (this.autoRefreshToken && currentSession.refresh_token) {
                const { error } = await this._callRefreshToken(currentSession.refresh_token);
                if (error) {
                  console.error(error);
                  if (!isAuthRetryableFetchError(error)) {
                    this._debug(debugName, "refresh failed with a non-retryable error, removing the session", error);
                    await this._removeSession();
                  }
                }
              }
            } else {
              await this._notifyAllSubscribers("SIGNED_IN", currentSession);
            }
          } catch (err) {
            this._debug(debugName, "error", err);
            console.error(err);
            return;
          } finally {
            this._debug(debugName, "end");
          }
        }
        async _callRefreshToken(refreshToken) {
          var _a, _b;
          if (!refreshToken) {
            throw new AuthSessionMissingError();
          }
          if (this.refreshingDeferred) {
            return this.refreshingDeferred.promise;
          }
          const debugName = `#_callRefreshToken(${refreshToken.substring(0, 5)}...)`;
          this._debug(debugName, "begin");
          try {
            this.refreshingDeferred = new Deferred();
            const { data, error } = await this._refreshAccessToken(refreshToken);
            if (error)
              throw error;
            if (!data.session)
              throw new AuthSessionMissingError();
            await this._saveSession(data.session);
            await this._notifyAllSubscribers("TOKEN_REFRESHED", data.session);
            const result = { session: data.session, error: null };
            this.refreshingDeferred.resolve(result);
            return result;
          } catch (error) {
            this._debug(debugName, "error", error);
            if (isAuthError(error)) {
              const result = { session: null, error };
              if (!isAuthRetryableFetchError(error)) {
                await this._removeSession();
              }
              (_a = this.refreshingDeferred) === null || _a === void 0 ? void 0 : _a.resolve(result);
              return result;
            }
            (_b = this.refreshingDeferred) === null || _b === void 0 ? void 0 : _b.reject(error);
            throw error;
          } finally {
            this.refreshingDeferred = null;
            this._debug(debugName, "end");
          }
        }
        async _notifyAllSubscribers(event, session, broadcast = true) {
          const debugName = `#_notifyAllSubscribers(${event})`;
          this._debug(debugName, "begin", session, `broadcast = ${broadcast}`);
          try {
            if (this.broadcastChannel && broadcast) {
              this.broadcastChannel.postMessage({ event, session });
            }
            const errors = [];
            const promises = Array.from(this.stateChangeEmitters.values()).map(async (x) => {
              try {
                await x.callback(event, session);
              } catch (e) {
                errors.push(e);
              }
            });
            await Promise.all(promises);
            if (errors.length > 0) {
              for (let i = 0; i < errors.length; i += 1) {
                console.error(errors[i]);
              }
              throw errors[0];
            }
          } finally {
            this._debug(debugName, "end");
          }
        }
        /**
         * set currentSession and currentUser
         * process to _startAutoRefreshToken if possible
         */
        async _saveSession(session) {
          this._debug("#_saveSession()", session);
          this.suppressGetSessionWarning = true;
          await setItemAsync(this.storage, this.storageKey, session);
        }
        async _removeSession() {
          this._debug("#_removeSession()");
          await removeItemAsync(this.storage, this.storageKey);
          await this._notifyAllSubscribers("SIGNED_OUT", null);
        }
        /**
         * Removes any registered visibilitychange callback.
         *
         * {@see #startAutoRefresh}
         * {@see #stopAutoRefresh}
         */
        _removeVisibilityChangedCallback() {
          this._debug("#_removeVisibilityChangedCallback()");
          const callback = this.visibilityChangedCallback;
          this.visibilityChangedCallback = null;
          try {
            if (callback && isBrowser() && (window === null || window === void 0 ? void 0 : window.removeEventListener)) {
              window.removeEventListener("visibilitychange", callback);
            }
          } catch (e) {
            console.error("removing visibilitychange callback failed", e);
          }
        }
        /**
         * This is the private implementation of {@link #startAutoRefresh}. Use this
         * within the library.
         */
        async _startAutoRefresh() {
          await this._stopAutoRefresh();
          this._debug("#_startAutoRefresh()");
          const ticker = setInterval(() => this._autoRefreshTokenTick(), AUTO_REFRESH_TICK_DURATION_MS);
          this.autoRefreshTicker = ticker;
          if (ticker && typeof ticker === "object" && typeof ticker.unref === "function") {
            ticker.unref();
          } else if (typeof Deno !== "undefined" && typeof Deno.unrefTimer === "function") {
            Deno.unrefTimer(ticker);
          }
          setTimeout(async () => {
            await this.initializePromise;
            await this._autoRefreshTokenTick();
          }, 0);
        }
        /**
         * This is the private implementation of {@link #stopAutoRefresh}. Use this
         * within the library.
         */
        async _stopAutoRefresh() {
          this._debug("#_stopAutoRefresh()");
          const ticker = this.autoRefreshTicker;
          this.autoRefreshTicker = null;
          if (ticker) {
            clearInterval(ticker);
          }
        }
        /**
         * Starts an auto-refresh process in the background. The session is checked
         * every few seconds. Close to the time of expiration a process is started to
         * refresh the session. If refreshing fails it will be retried for as long as
         * necessary.
         *
         * If you set the {@link GoTrueClientOptions#autoRefreshToken} you don't need
         * to call this function, it will be called for you.
         *
         * On browsers the refresh process works only when the tab/window is in the
         * foreground to conserve resources as well as prevent race conditions and
         * flooding auth with requests. If you call this method any managed
         * visibility change callback will be removed and you must manage visibility
         * changes on your own.
         *
         * On non-browser platforms the refresh process works *continuously* in the
         * background, which may not be desirable. You should hook into your
         * platform's foreground indication mechanism and call these methods
         * appropriately to conserve resources.
         *
         * {@see #stopAutoRefresh}
         */
        async startAutoRefresh() {
          this._removeVisibilityChangedCallback();
          await this._startAutoRefresh();
        }
        /**
         * Stops an active auto refresh process running in the background (if any).
         *
         * If you call this method any managed visibility change callback will be
         * removed and you must manage visibility changes on your own.
         *
         * See {@link #startAutoRefresh} for more details.
         */
        async stopAutoRefresh() {
          this._removeVisibilityChangedCallback();
          await this._stopAutoRefresh();
        }
        /**
         * Runs the auto refresh token tick.
         */
        async _autoRefreshTokenTick() {
          this._debug("#_autoRefreshTokenTick()", "begin");
          try {
            await this._acquireLock(0, async () => {
              try {
                const now = Date.now();
                try {
                  return await this._useSession(async (result) => {
                    const { data: { session } } = result;
                    if (!session || !session.refresh_token || !session.expires_at) {
                      this._debug("#_autoRefreshTokenTick()", "no session");
                      return;
                    }
                    const expiresInTicks = Math.floor((session.expires_at * 1e3 - now) / AUTO_REFRESH_TICK_DURATION_MS);
                    this._debug("#_autoRefreshTokenTick()", `access token expires in ${expiresInTicks} ticks, a tick lasts ${AUTO_REFRESH_TICK_DURATION_MS}ms, refresh threshold is ${AUTO_REFRESH_TICK_THRESHOLD} ticks`);
                    if (expiresInTicks <= AUTO_REFRESH_TICK_THRESHOLD) {
                      await this._callRefreshToken(session.refresh_token);
                    }
                  });
                } catch (e) {
                  console.error("Auto refresh tick failed with error. This is likely a transient error.", e);
                }
              } finally {
                this._debug("#_autoRefreshTokenTick()", "end");
              }
            });
          } catch (e) {
            if (e.isAcquireTimeout || e instanceof LockAcquireTimeoutError) {
              this._debug("auto refresh token tick lock not available");
            } else {
              throw e;
            }
          }
        }
        /**
         * Registers callbacks on the browser / platform, which in-turn run
         * algorithms when the browser window/tab are in foreground. On non-browser
         * platforms it assumes always foreground.
         */
        async _handleVisibilityChange() {
          this._debug("#_handleVisibilityChange()");
          if (!isBrowser() || !(window === null || window === void 0 ? void 0 : window.addEventListener)) {
            if (this.autoRefreshToken) {
              this.startAutoRefresh();
            }
            return false;
          }
          try {
            this.visibilityChangedCallback = async () => await this._onVisibilityChanged(false);
            window === null || window === void 0 ? void 0 : window.addEventListener("visibilitychange", this.visibilityChangedCallback);
            await this._onVisibilityChanged(true);
          } catch (error) {
            console.error("_handleVisibilityChange", error);
          }
        }
        /**
         * Callback registered with `window.addEventListener('visibilitychange')`.
         */
        async _onVisibilityChanged(calledFromInitialize) {
          const methodName = `#_onVisibilityChanged(${calledFromInitialize})`;
          this._debug(methodName, "visibilityState", document.visibilityState);
          if (document.visibilityState === "visible") {
            if (this.autoRefreshToken) {
              this._startAutoRefresh();
            }
            if (!calledFromInitialize) {
              await this.initializePromise;
              await this._acquireLock(-1, async () => {
                if (document.visibilityState !== "visible") {
                  this._debug(methodName, "acquired the lock to recover the session, but the browser visibilityState is no longer visible, aborting");
                  return;
                }
                await this._recoverAndRefresh();
              });
            }
          } else if (document.visibilityState === "hidden") {
            if (this.autoRefreshToken) {
              this._stopAutoRefresh();
            }
          }
        }
        /**
         * Generates the relevant login URL for a third-party provider.
         * @param options.redirectTo A URL or mobile address to send the user to after they are confirmed.
         * @param options.scopes A space-separated list of scopes granted to the OAuth application.
         * @param options.queryParams An object of key-value pairs containing query parameters granted to the OAuth application.
         */
        async _getUrlForProvider(url, provider, options) {
          const urlParams = [`provider=${encodeURIComponent(provider)}`];
          if (options === null || options === void 0 ? void 0 : options.redirectTo) {
            urlParams.push(`redirect_to=${encodeURIComponent(options.redirectTo)}`);
          }
          if (options === null || options === void 0 ? void 0 : options.scopes) {
            urlParams.push(`scopes=${encodeURIComponent(options.scopes)}`);
          }
          if (this.flowType === "pkce") {
            const [codeChallenge, codeChallengeMethod] = await getCodeChallengeAndMethod(this.storage, this.storageKey);
            const flowParams = new URLSearchParams({
              code_challenge: `${encodeURIComponent(codeChallenge)}`,
              code_challenge_method: `${encodeURIComponent(codeChallengeMethod)}`
            });
            urlParams.push(flowParams.toString());
          }
          if (options === null || options === void 0 ? void 0 : options.queryParams) {
            const query = new URLSearchParams(options.queryParams);
            urlParams.push(query.toString());
          }
          if (options === null || options === void 0 ? void 0 : options.skipBrowserRedirect) {
            urlParams.push(`skip_http_redirect=${options.skipBrowserRedirect}`);
          }
          return `${url}?${urlParams.join("&")}`;
        }
        async _unenroll(params) {
          try {
            return await this._useSession(async (result) => {
              var _a;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              return await _request(this.fetch, "DELETE", `${this.url}/factors/${params.factorId}`, {
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        async _enroll(params) {
          try {
            return await this._useSession(async (result) => {
              var _a, _b;
              const { data: sessionData, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              const body = Object.assign({ friendly_name: params.friendlyName, factor_type: params.factorType }, params.factorType === "phone" ? { phone: params.phone } : { issuer: params.issuer });
              const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors`, {
                body,
                headers: this.headers,
                jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
              });
              if (error) {
                return { data: null, error };
              }
              if (params.factorType === "totp" && ((_b = data === null || data === void 0 ? void 0 : data.totp) === null || _b === void 0 ? void 0 : _b.qr_code)) {
                data.totp.qr_code = `data:image/svg+xml;utf-8,${data.totp.qr_code}`;
              }
              return { data, error: null };
            });
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
        /**
         * {@see GoTrueMFAApi#verify}
         */
        async _verify(params) {
          return this._acquireLock(-1, async () => {
            try {
              return await this._useSession(async (result) => {
                var _a;
                const { data: sessionData, error: sessionError } = result;
                if (sessionError) {
                  return { data: null, error: sessionError };
                }
                const { data, error } = await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/verify`, {
                  body: { code: params.code, challenge_id: params.challengeId },
                  headers: this.headers,
                  jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
                });
                if (error) {
                  return { data: null, error };
                }
                await this._saveSession(Object.assign({ expires_at: Math.round(Date.now() / 1e3) + data.expires_in }, data));
                await this._notifyAllSubscribers("MFA_CHALLENGE_VERIFIED", data);
                return { data, error };
              });
            } catch (error) {
              if (isAuthError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * {@see GoTrueMFAApi#challenge}
         */
        async _challenge(params) {
          return this._acquireLock(-1, async () => {
            try {
              return await this._useSession(async (result) => {
                var _a;
                const { data: sessionData, error: sessionError } = result;
                if (sessionError) {
                  return { data: null, error: sessionError };
                }
                return await _request(this.fetch, "POST", `${this.url}/factors/${params.factorId}/challenge`, {
                  body: { channel: params.channel },
                  headers: this.headers,
                  jwt: (_a = sessionData === null || sessionData === void 0 ? void 0 : sessionData.session) === null || _a === void 0 ? void 0 : _a.access_token
                });
              });
            } catch (error) {
              if (isAuthError(error)) {
                return { data: null, error };
              }
              throw error;
            }
          });
        }
        /**
         * {@see GoTrueMFAApi#challengeAndVerify}
         */
        async _challengeAndVerify(params) {
          const { data: challengeData, error: challengeError } = await this._challenge({
            factorId: params.factorId
          });
          if (challengeError) {
            return { data: null, error: challengeError };
          }
          return await this._verify({
            factorId: params.factorId,
            challengeId: challengeData.id,
            code: params.code
          });
        }
        /**
         * {@see GoTrueMFAApi#listFactors}
         */
        async _listFactors() {
          const { data: { user }, error: userError } = await this.getUser();
          if (userError) {
            return { data: null, error: userError };
          }
          const factors = (user === null || user === void 0 ? void 0 : user.factors) || [];
          const totp = factors.filter((factor) => factor.factor_type === "totp" && factor.status === "verified");
          const phone = factors.filter((factor) => factor.factor_type === "phone" && factor.status === "verified");
          return {
            data: {
              all: factors,
              totp,
              phone
            },
            error: null
          };
        }
        /**
         * {@see GoTrueMFAApi#getAuthenticatorAssuranceLevel}
         */
        async _getAuthenticatorAssuranceLevel() {
          return this._acquireLock(-1, async () => {
            return await this._useSession(async (result) => {
              var _a, _b;
              const { data: { session }, error: sessionError } = result;
              if (sessionError) {
                return { data: null, error: sessionError };
              }
              if (!session) {
                return {
                  data: { currentLevel: null, nextLevel: null, currentAuthenticationMethods: [] },
                  error: null
                };
              }
              const { payload } = decodeJWT(session.access_token);
              let currentLevel = null;
              if (payload.aal) {
                currentLevel = payload.aal;
              }
              let nextLevel = currentLevel;
              const verifiedFactors = (_b = (_a = session.user.factors) === null || _a === void 0 ? void 0 : _a.filter((factor) => factor.status === "verified")) !== null && _b !== void 0 ? _b : [];
              if (verifiedFactors.length > 0) {
                nextLevel = "aal2";
              }
              const currentAuthenticationMethods = payload.amr || [];
              return { data: { currentLevel, nextLevel, currentAuthenticationMethods }, error: null };
            });
          });
        }
        async fetchJwk(kid, jwks = { keys: [] }) {
          let jwk = jwks.keys.find((key) => key.kid === kid);
          if (jwk) {
            return jwk;
          }
          jwk = this.jwks.keys.find((key) => key.kid === kid);
          if (jwk && this.jwks_cached_at + JWKS_TTL > Date.now()) {
            return jwk;
          }
          const { data, error } = await _request(this.fetch, "GET", `${this.url}/.well-known/jwks.json`, {
            headers: this.headers
          });
          if (error) {
            throw error;
          }
          if (!data.keys || data.keys.length === 0) {
            throw new AuthInvalidJwtError("JWKS is empty");
          }
          this.jwks = data;
          this.jwks_cached_at = Date.now();
          jwk = data.keys.find((key) => key.kid === kid);
          if (!jwk) {
            throw new AuthInvalidJwtError("No matching signing key found in JWKS");
          }
          return jwk;
        }
        /**
         * @experimental This method may change in future versions.
         * @description Gets the claims from a JWT. If the JWT is symmetric JWTs, it will call getUser() to verify against the server. If the JWT is asymmetric, it will be verified against the JWKS using the WebCrypto API.
         */
        async getClaims(jwt, jwks = { keys: [] }) {
          try {
            let token = jwt;
            if (!token) {
              const { data, error } = await this.getSession();
              if (error || !data.session) {
                return { data: null, error };
              }
              token = data.session.access_token;
            }
            const { header, payload, signature, raw: { header: rawHeader, payload: rawPayload } } = decodeJWT(token);
            validateExp(payload.exp);
            if (!header.kid || header.alg === "HS256" || !("crypto" in globalThis && "subtle" in globalThis.crypto)) {
              const { error } = await this.getUser(token);
              if (error) {
                throw error;
              }
              return {
                data: {
                  claims: payload,
                  header,
                  signature
                },
                error: null
              };
            }
            const algorithm = getAlgorithm(header.alg);
            const signingKey = await this.fetchJwk(header.kid, jwks);
            const publicKey = await crypto.subtle.importKey("jwk", signingKey, algorithm, true, [
              "verify"
            ]);
            const isValid = await crypto.subtle.verify(algorithm, publicKey, signature, stringToUint8Array(`${rawHeader}.${rawPayload}`));
            if (!isValid) {
              throw new AuthInvalidJwtError("Invalid JWT signature");
            }
            return {
              data: {
                claims: payload,
                header,
                signature
              },
              error: null
            };
          } catch (error) {
            if (isAuthError(error)) {
              return { data: null, error };
            }
            throw error;
          }
        }
      };
      GoTrueClient.nextInstanceID = 0;
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js
  var AuthAdminApi, AuthAdminApi_default;
  var init_AuthAdminApi = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/AuthAdminApi.js"() {
      init_GoTrueAdminApi();
      AuthAdminApi = GoTrueAdminApi;
      AuthAdminApi_default = AuthAdminApi;
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/AuthClient.js
  var AuthClient, AuthClient_default;
  var init_AuthClient = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/AuthClient.js"() {
      init_GoTrueClient();
      AuthClient = GoTrueClient;
      AuthClient_default = AuthClient;
    }
  });

  // project/node_modules/@supabase/auth-js/dist/module/index.js
  var init_module4 = __esm({
    "project/node_modules/@supabase/auth-js/dist/module/index.js"() {
      init_GoTrueAdminApi();
      init_GoTrueClient();
      init_AuthAdminApi();
      init_AuthClient();
      init_types3();
      init_errors2();
      init_locks();
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js
  var SupabaseAuthClient;
  var init_SupabaseAuthClient = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/lib/SupabaseAuthClient.js"() {
      init_module4();
      SupabaseAuthClient = class extends AuthClient_default {
        constructor(options) {
          super(options);
        }
      };
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js
  var __awaiter8, SupabaseClient;
  var init_SupabaseClient = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/SupabaseClient.js"() {
      init_module();
      init_wrapper();
      init_module2();
      init_module3();
      init_constants3();
      init_fetch2();
      init_helpers2();
      init_SupabaseAuthClient();
      __awaiter8 = function(thisArg, _arguments, P, generator) {
        function adopt(value) {
          return value instanceof P ? value : new P(function(resolve) {
            resolve(value);
          });
        }
        return new (P || (P = Promise))(function(resolve, reject) {
          function fulfilled(value) {
            try {
              step(generator.next(value));
            } catch (e) {
              reject(e);
            }
          }
          function rejected(value) {
            try {
              step(generator["throw"](value));
            } catch (e) {
              reject(e);
            }
          }
          function step(result) {
            result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
          }
          step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
      };
      SupabaseClient = class {
        /**
         * Create a new client for use in the browser.
         * @param supabaseUrl The unique Supabase URL which is supplied when you create a new project in your project dashboard.
         * @param supabaseKey The unique Supabase Key which is supplied when you create a new project in your project dashboard.
         * @param options.db.schema You can switch in between schemas. The schema needs to be on the list of exposed schemas inside Supabase.
         * @param options.auth.autoRefreshToken Set to "true" if you want to automatically refresh the token before expiring.
         * @param options.auth.persistSession Set to "true" if you want to automatically save the user session into local storage.
         * @param options.auth.detectSessionInUrl Set to "true" if you want to automatically detects OAuth grants in the URL and signs in the user.
         * @param options.realtime Options passed along to realtime-js constructor.
         * @param options.global.fetch A custom fetch implementation.
         * @param options.global.headers Any additional headers to send with each network request.
         */
        constructor(supabaseUrl, supabaseKey, options) {
          var _a, _b, _c;
          this.supabaseUrl = supabaseUrl;
          this.supabaseKey = supabaseKey;
          if (!supabaseUrl)
            throw new Error("supabaseUrl is required.");
          if (!supabaseKey)
            throw new Error("supabaseKey is required.");
          const _supabaseUrl = ensureTrailingSlash(supabaseUrl);
          const baseUrl = new URL(_supabaseUrl);
          this.realtimeUrl = new URL("realtime/v1", baseUrl);
          this.realtimeUrl.protocol = this.realtimeUrl.protocol.replace("http", "ws");
          this.authUrl = new URL("auth/v1", baseUrl);
          this.storageUrl = new URL("storage/v1", baseUrl);
          this.functionsUrl = new URL("functions/v1", baseUrl);
          const defaultStorageKey = `sb-${baseUrl.hostname.split(".")[0]}-auth-token`;
          const DEFAULTS = {
            db: DEFAULT_DB_OPTIONS,
            realtime: DEFAULT_REALTIME_OPTIONS,
            auth: Object.assign(Object.assign({}, DEFAULT_AUTH_OPTIONS), { storageKey: defaultStorageKey }),
            global: DEFAULT_GLOBAL_OPTIONS
          };
          const settings = applySettingDefaults(options !== null && options !== void 0 ? options : {}, DEFAULTS);
          this.storageKey = (_a = settings.auth.storageKey) !== null && _a !== void 0 ? _a : "";
          this.headers = (_b = settings.global.headers) !== null && _b !== void 0 ? _b : {};
          if (!settings.accessToken) {
            this.auth = this._initSupabaseAuthClient((_c = settings.auth) !== null && _c !== void 0 ? _c : {}, this.headers, settings.global.fetch);
          } else {
            this.accessToken = settings.accessToken;
            this.auth = new Proxy({}, {
              get: (_, prop) => {
                throw new Error(`@supabase/supabase-js: Supabase Client is configured with the accessToken option, accessing supabase.auth.${String(prop)} is not possible`);
              }
            });
          }
          this.fetch = fetchWithAuth(supabaseKey, this._getAccessToken.bind(this), settings.global.fetch);
          this.realtime = this._initRealtimeClient(Object.assign({ headers: this.headers, accessToken: this._getAccessToken.bind(this) }, settings.realtime));
          this.rest = new PostgrestClient(new URL("rest/v1", baseUrl).href, {
            headers: this.headers,
            schema: settings.db.schema,
            fetch: this.fetch
          });
          if (!settings.accessToken) {
            this._listenForAuthEvents();
          }
        }
        /**
         * Supabase Functions allows you to deploy and invoke edge functions.
         */
        get functions() {
          return new FunctionsClient(this.functionsUrl.href, {
            headers: this.headers,
            customFetch: this.fetch
          });
        }
        /**
         * Supabase Storage allows you to manage user-generated content, such as photos or videos.
         */
        get storage() {
          return new StorageClient(this.storageUrl.href, this.headers, this.fetch);
        }
        /**
         * Perform a query on a table or a view.
         *
         * @param relation - The table or view name to query
         */
        from(relation) {
          return this.rest.from(relation);
        }
        // NOTE: signatures must be kept in sync with PostgrestClient.schema
        /**
         * Select a schema to query or perform an function (rpc) call.
         *
         * The schema needs to be on the list of exposed schemas inside Supabase.
         *
         * @param schema - The schema to query
         */
        schema(schema) {
          return this.rest.schema(schema);
        }
        // NOTE: signatures must be kept in sync with PostgrestClient.rpc
        /**
         * Perform a function call.
         *
         * @param fn - The function name to call
         * @param args - The arguments to pass to the function call
         * @param options - Named parameters
         * @param options.head - When set to `true`, `data` will not be returned.
         * Useful if you only need the count.
         * @param options.get - When set to `true`, the function will be called with
         * read-only access mode.
         * @param options.count - Count algorithm to use to count rows returned by the
         * function. Only applicable for [set-returning
         * functions](https://www.postgresql.org/docs/current/functions-srf.html).
         *
         * `"exact"`: Exact but slow count algorithm. Performs a `COUNT(*)` under the
         * hood.
         *
         * `"planned"`: Approximated but fast count algorithm. Uses the Postgres
         * statistics under the hood.
         *
         * `"estimated"`: Uses exact count for low numbers and planned count for high
         * numbers.
         */
        rpc(fn, args = {}, options = {}) {
          return this.rest.rpc(fn, args, options);
        }
        /**
         * Creates a Realtime channel with Broadcast, Presence, and Postgres Changes.
         *
         * @param {string} name - The name of the Realtime channel.
         * @param {Object} opts - The options to pass to the Realtime channel.
         *
         */
        channel(name, opts = { config: {} }) {
          return this.realtime.channel(name, opts);
        }
        /**
         * Returns all Realtime channels.
         */
        getChannels() {
          return this.realtime.getChannels();
        }
        /**
         * Unsubscribes and removes Realtime channel from Realtime client.
         *
         * @param {RealtimeChannel} channel - The name of the Realtime channel.
         *
         */
        removeChannel(channel) {
          return this.realtime.removeChannel(channel);
        }
        /**
         * Unsubscribes and removes all Realtime channels from Realtime client.
         */
        removeAllChannels() {
          return this.realtime.removeAllChannels();
        }
        _getAccessToken() {
          var _a, _b;
          return __awaiter8(this, void 0, void 0, function* () {
            if (this.accessToken) {
              return yield this.accessToken();
            }
            const { data } = yield this.auth.getSession();
            return (_b = (_a = data.session) === null || _a === void 0 ? void 0 : _a.access_token) !== null && _b !== void 0 ? _b : null;
          });
        }
        _initSupabaseAuthClient({ autoRefreshToken, persistSession, detectSessionInUrl, storage, storageKey, flowType, lock, debug }, headers, fetch3) {
          const authHeaders = {
            Authorization: `Bearer ${this.supabaseKey}`,
            apikey: `${this.supabaseKey}`
          };
          return new SupabaseAuthClient({
            url: this.authUrl.href,
            headers: Object.assign(Object.assign({}, authHeaders), headers),
            storageKey,
            autoRefreshToken,
            persistSession,
            detectSessionInUrl,
            storage,
            flowType,
            lock,
            debug,
            fetch: fetch3,
            // auth checks if there is a custom authorizaiton header using this flag
            // so it knows whether to return an error when getUser is called with no session
            hasCustomAuthorizationHeader: "Authorization" in this.headers
          });
        }
        _initRealtimeClient(options) {
          return new RealtimeClient(this.realtimeUrl.href, Object.assign(Object.assign({}, options), { params: Object.assign({ apikey: this.supabaseKey }, options === null || options === void 0 ? void 0 : options.params) }));
        }
        _listenForAuthEvents() {
          let data = this.auth.onAuthStateChange((event, session) => {
            this._handleTokenChanged(event, "CLIENT", session === null || session === void 0 ? void 0 : session.access_token);
          });
          return data;
        }
        _handleTokenChanged(event, source, token) {
          if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && this.changedAccessToken !== token) {
            this.changedAccessToken = token;
          } else if (event === "SIGNED_OUT") {
            this.realtime.setAuth();
            if (source == "STORAGE")
              this.auth.signOut();
            this.changedAccessToken = void 0;
          }
        }
      };
    }
  });

  // project/node_modules/@supabase/supabase-js/dist/module/index.js
  var module_exports = {};
  __export(module_exports, {
    AuthAdminApi: () => AuthAdminApi_default,
    AuthApiError: () => AuthApiError,
    AuthClient: () => AuthClient_default,
    AuthError: () => AuthError,
    AuthImplicitGrantRedirectError: () => AuthImplicitGrantRedirectError,
    AuthInvalidCredentialsError: () => AuthInvalidCredentialsError,
    AuthInvalidJwtError: () => AuthInvalidJwtError,
    AuthInvalidTokenResponseError: () => AuthInvalidTokenResponseError,
    AuthPKCEGrantCodeExchangeError: () => AuthPKCEGrantCodeExchangeError,
    AuthRetryableFetchError: () => AuthRetryableFetchError,
    AuthSessionMissingError: () => AuthSessionMissingError,
    AuthUnknownError: () => AuthUnknownError,
    AuthWeakPasswordError: () => AuthWeakPasswordError,
    CustomAuthError: () => CustomAuthError,
    FunctionRegion: () => FunctionRegion,
    FunctionsError: () => FunctionsError,
    FunctionsFetchError: () => FunctionsFetchError,
    FunctionsHttpError: () => FunctionsHttpError,
    FunctionsRelayError: () => FunctionsRelayError,
    GoTrueAdminApi: () => GoTrueAdminApi,
    GoTrueClient: () => GoTrueClient,
    NavigatorLockAcquireTimeoutError: () => NavigatorLockAcquireTimeoutError,
    PostgrestError: () => PostgrestError,
    REALTIME_CHANNEL_STATES: () => REALTIME_CHANNEL_STATES,
    REALTIME_LISTEN_TYPES: () => REALTIME_LISTEN_TYPES,
    REALTIME_POSTGRES_CHANGES_LISTEN_EVENT: () => REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
    REALTIME_PRESENCE_LISTEN_EVENTS: () => REALTIME_PRESENCE_LISTEN_EVENTS,
    REALTIME_SUBSCRIBE_STATES: () => REALTIME_SUBSCRIBE_STATES,
    RealtimeChannel: () => RealtimeChannel,
    RealtimeClient: () => RealtimeClient,
    RealtimePresence: () => RealtimePresence,
    SIGN_OUT_SCOPES: () => SIGN_OUT_SCOPES,
    SupabaseClient: () => SupabaseClient,
    createClient: () => createClient,
    isAuthApiError: () => isAuthApiError,
    isAuthError: () => isAuthError,
    isAuthImplicitGrantRedirectError: () => isAuthImplicitGrantRedirectError,
    isAuthRetryableFetchError: () => isAuthRetryableFetchError,
    isAuthSessionMissingError: () => isAuthSessionMissingError,
    isAuthWeakPasswordError: () => isAuthWeakPasswordError,
    lockInternals: () => internals,
    navigatorLock: () => navigatorLock,
    processLock: () => processLock
  });
  var createClient;
  var init_module5 = __esm({
    "project/node_modules/@supabase/supabase-js/dist/module/index.js"() {
      init_SupabaseClient();
      init_module4();
      init_wrapper();
      init_module();
      init_module2();
      init_SupabaseClient();
      createClient = (supabaseUrl, supabaseKey, options) => {
        return new SupabaseClient(supabaseUrl, supabaseKey, options);
      };
    }
  });

  // project/node_modules/tslib/tslib.es6.mjs
  function __awaiter9(thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P ? value : new P(function(resolve) {
        resolve(value);
      });
    }
    return new (P || (P = Promise))(function(resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value));
        } catch (e) {
          reject(e);
        }
      }
      function rejected(value) {
        try {
          step(generator["throw"](value));
        } catch (e) {
          reject(e);
        }
      }
      function step(result) {
        result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
  }
  var init_tslib_es6 = __esm({
    "project/node_modules/tslib/tslib.es6.mjs"() {
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/RequestMethod.js
  var RequestMethod;
  var init_RequestMethod = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/RequestMethod.js"() {
      (function(RequestMethod2) {
        RequestMethod2["GET"] = "GET";
        RequestMethod2["PATCH"] = "PATCH";
        RequestMethod2["POST"] = "POST";
        RequestMethod2["PUT"] = "PUT";
        RequestMethod2["DELETE"] = "DELETE";
      })(RequestMethod || (RequestMethod = {}));
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/content/BatchRequestContent.js
  var BatchRequestContent;
  var init_BatchRequestContent = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/content/BatchRequestContent.js"() {
      init_tslib_es6();
      init_RequestMethod();
      BatchRequestContent = class _BatchRequestContent {
        /**
         * @private
         * @static
         * Validates the dependency chain of the requests
         *
         * Note:
         * Individual requests can depend on other individual requests. Currently, requests can only depend on a single other request, and must follow one of these three patterns:
         * 1. Parallel - no individual request states a dependency in the dependsOn property.
         * 2. Serial - all individual requests depend on the previous individual request.
         * 3. Same - all individual requests that state a dependency in the dependsOn property, state the same dependency.
         * As JSON batching matures, these limitations will be removed.
         * @see {@link https://developer.microsoft.com/en-us/graph/docs/concepts/known_issues#json-batching}
         *
         * @param {Map<string, BatchRequestStep>} requests - The map of requests.
         * @returns The boolean indicating the validation status
         */
        static validateDependencies(requests) {
          const isParallel = (reqs) => {
            const iterator = reqs.entries();
            let cur = iterator.next();
            while (!cur.done) {
              const curReq = cur.value[1];
              if (curReq.dependsOn !== void 0 && curReq.dependsOn.length > 0) {
                return false;
              }
              cur = iterator.next();
            }
            return true;
          };
          const isSerial = (reqs) => {
            const iterator = reqs.entries();
            let cur = iterator.next();
            const firstRequest = cur.value[1];
            if (firstRequest.dependsOn !== void 0 && firstRequest.dependsOn.length > 0) {
              return false;
            }
            let prev = cur;
            cur = iterator.next();
            while (!cur.done) {
              const curReq = cur.value[1];
              if (curReq.dependsOn === void 0 || curReq.dependsOn.length !== 1 || curReq.dependsOn[0] !== prev.value[1].id) {
                return false;
              }
              prev = cur;
              cur = iterator.next();
            }
            return true;
          };
          const isSame = (reqs) => {
            const iterator = reqs.entries();
            let cur = iterator.next();
            const firstRequest = cur.value[1];
            let dependencyId;
            if (firstRequest.dependsOn === void 0 || firstRequest.dependsOn.length === 0) {
              dependencyId = firstRequest.id;
            } else {
              if (firstRequest.dependsOn.length === 1) {
                const fDependencyId = firstRequest.dependsOn[0];
                if (fDependencyId !== firstRequest.id && reqs.has(fDependencyId)) {
                  dependencyId = fDependencyId;
                } else {
                  return false;
                }
              } else {
                return false;
              }
            }
            cur = iterator.next();
            while (!cur.done) {
              const curReq = cur.value[1];
              if ((curReq.dependsOn === void 0 || curReq.dependsOn.length === 0) && dependencyId !== curReq.id) {
                return false;
              }
              if (curReq.dependsOn !== void 0 && curReq.dependsOn.length !== 0) {
                if (curReq.dependsOn.length === 1 && (curReq.id === dependencyId || curReq.dependsOn[0] !== dependencyId)) {
                  return false;
                }
                if (curReq.dependsOn.length > 1) {
                  return false;
                }
              }
              cur = iterator.next();
            }
            return true;
          };
          if (requests.size === 0) {
            const error = new Error("Empty requests map, Please provide at least one request.");
            error.name = "Empty Requests Error";
            throw error;
          }
          return isParallel(requests) || isSerial(requests) || isSame(requests);
        }
        /**
         * @private
         * @static
         * @async
         * Converts Request Object instance to a JSON
         * @param {IsomorphicRequest} request - The IsomorphicRequest Object instance
         * @returns A promise that resolves to JSON representation of a request
         */
        static getRequestData(request) {
          return __awaiter9(this, void 0, void 0, function* () {
            const requestData = {
              url: ""
            };
            const hasHttpRegex = new RegExp("^https?://");
            requestData.url = hasHttpRegex.test(request.url) ? "/" + request.url.split(/.*?\/\/.*?\//)[1] : request.url;
            requestData.method = request.method;
            const headers = {};
            request.headers.forEach((value, key) => {
              headers[key] = value;
            });
            if (Object.keys(headers).length) {
              requestData.headers = headers;
            }
            if (request.method === RequestMethod.PATCH || request.method === RequestMethod.POST || request.method === RequestMethod.PUT) {
              requestData.body = yield _BatchRequestContent.getRequestBody(request);
            }
            return requestData;
          });
        }
        /**
         * @private
         * @static
         * @async
         * Gets the body of a Request object instance
         * @param {IsomorphicRequest} request - The IsomorphicRequest object instance
         * @returns The Promise that resolves to a body value of a Request
         */
        static getRequestBody(request) {
          return __awaiter9(this, void 0, void 0, function* () {
            let bodyParsed = false;
            let body;
            try {
              const cloneReq = request.clone();
              body = yield cloneReq.json();
              bodyParsed = true;
            } catch (e) {
            }
            if (!bodyParsed) {
              try {
                if (typeof Blob !== "undefined") {
                  const blob = yield request.blob();
                  const reader = new FileReader();
                  body = yield new Promise((resolve) => {
                    reader.addEventListener("load", () => {
                      const dataURL = reader.result;
                      const regex = new RegExp("^s*data:(.+?/.+?(;.+?=.+?)*)?(;base64)?,(.*)s*$");
                      const segments = regex.exec(dataURL);
                      resolve(segments[4]);
                    }, false);
                    reader.readAsDataURL(blob);
                  });
                } else if (typeof Buffer !== "undefined") {
                  const buffer = yield request.buffer();
                  body = buffer.toString("base64");
                }
                bodyParsed = true;
              } catch (e) {
              }
            }
            return body;
          });
        }
        /**
         * @public
         * @constructor
         * Constructs a BatchRequestContent instance
         * @param {BatchRequestStep[]} [requests] - Array of requests value
         * @returns An instance of a BatchRequestContent
         */
        constructor(requests) {
          this.requests = /* @__PURE__ */ new Map();
          if (typeof requests !== "undefined") {
            const limit = _BatchRequestContent.requestLimit;
            if (requests.length > limit) {
              const error = new Error(`Maximum requests limit exceeded, Max allowed number of requests are ${limit}`);
              error.name = "Limit Exceeded Error";
              throw error;
            }
            for (const req of requests) {
              this.addRequest(req);
            }
          }
        }
        /**
         * @public
         * Adds a request to the batch request content
         * @param {BatchRequestStep} request - The request value
         * @returns The id of the added request
         */
        addRequest(request) {
          const limit = _BatchRequestContent.requestLimit;
          if (request.id === "") {
            const error = new Error(`Id for a request is empty, Please provide an unique id`);
            error.name = "Empty Id For Request";
            throw error;
          }
          if (this.requests.size === limit) {
            const error = new Error(`Maximum requests limit exceeded, Max allowed number of requests are ${limit}`);
            error.name = "Limit Exceeded Error";
            throw error;
          }
          if (this.requests.has(request.id)) {
            const error = new Error(`Adding request with duplicate id ${request.id}, Make the id of the requests unique`);
            error.name = "Duplicate RequestId Error";
            throw error;
          }
          this.requests.set(request.id, request);
          return request.id;
        }
        /**
         * @public
         * Removes request from the batch payload and its dependencies from all dependents
         * @param {string} requestId - The id of a request that needs to be removed
         * @returns The boolean indicating removed status
         */
        removeRequest(requestId) {
          const deleteStatus = this.requests.delete(requestId);
          const iterator = this.requests.entries();
          let cur = iterator.next();
          while (!cur.done) {
            const dependencies = cur.value[1].dependsOn;
            if (typeof dependencies !== "undefined") {
              const index2 = dependencies.indexOf(requestId);
              if (index2 !== -1) {
                dependencies.splice(index2, 1);
              }
              if (dependencies.length === 0) {
                delete cur.value[1].dependsOn;
              }
            }
            cur = iterator.next();
          }
          return deleteStatus;
        }
        /**
         * @public
         * @async
         * Serialize content from BatchRequestContent instance
         * @returns The body content to make batch request
         */
        getContent() {
          return __awaiter9(this, void 0, void 0, function* () {
            const requests = [];
            const requestBody = {
              requests
            };
            const iterator = this.requests.entries();
            let cur = iterator.next();
            if (cur.done) {
              const error = new Error("No requests added yet, Please add at least one request.");
              error.name = "Empty Payload";
              throw error;
            }
            if (!_BatchRequestContent.validateDependencies(this.requests)) {
              const error = new Error(`Invalid dependency found, Dependency should be:
1. Parallel - no individual request states a dependency in the dependsOn property.
2. Serial - all individual requests depend on the previous individual request.
3. Same - all individual requests that state a dependency in the dependsOn property, state the same dependency.`);
              error.name = "Invalid Dependency";
              throw error;
            }
            while (!cur.done) {
              const requestStep = cur.value[1];
              const batchRequestData = yield _BatchRequestContent.getRequestData(requestStep.request);
              if (batchRequestData.body !== void 0 && (batchRequestData.headers === void 0 || batchRequestData.headers["content-type"] === void 0)) {
                const error = new Error(`Content-type header is not mentioned for request #${requestStep.id}, For request having body, Content-type header should be mentioned`);
                error.name = "Invalid Content-type header";
                throw error;
              }
              batchRequestData.id = requestStep.id;
              if (requestStep.dependsOn !== void 0 && requestStep.dependsOn.length > 0) {
                batchRequestData.dependsOn = requestStep.dependsOn;
              }
              requests.push(batchRequestData);
              cur = iterator.next();
            }
            requestBody.requests = requests;
            return requestBody;
          });
        }
        /**
         * @public
         * Adds a dependency for a given dependent request
         * @param {string} dependentId - The id of the dependent request
         * @param {string} [dependencyId] - The id of the dependency request, if not specified the preceding request will be considered as a dependency
         * @returns Nothing
         */
        addDependency(dependentId, dependencyId) {
          if (!this.requests.has(dependentId)) {
            const error = new Error(`Dependent ${dependentId} does not exists, Please check the id`);
            error.name = "Invalid Dependent";
            throw error;
          }
          if (typeof dependencyId !== "undefined" && !this.requests.has(dependencyId)) {
            const error = new Error(`Dependency ${dependencyId} does not exists, Please check the id`);
            error.name = "Invalid Dependency";
            throw error;
          }
          if (typeof dependencyId !== "undefined") {
            const dependent = this.requests.get(dependentId);
            if (dependent.dependsOn === void 0) {
              dependent.dependsOn = [];
            }
            if (dependent.dependsOn.indexOf(dependencyId) !== -1) {
              const error = new Error(`Dependency ${dependencyId} is already added for the request ${dependentId}`);
              error.name = "Duplicate Dependency";
              throw error;
            }
            dependent.dependsOn.push(dependencyId);
          } else {
            const iterator = this.requests.entries();
            let prev;
            let cur = iterator.next();
            while (!cur.done && cur.value[1].id !== dependentId) {
              prev = cur;
              cur = iterator.next();
            }
            if (typeof prev !== "undefined") {
              const dId = prev.value[0];
              if (cur.value[1].dependsOn === void 0) {
                cur.value[1].dependsOn = [];
              }
              if (cur.value[1].dependsOn.indexOf(dId) !== -1) {
                const error = new Error(`Dependency ${dId} is already added for the request ${dependentId}`);
                error.name = "Duplicate Dependency";
                throw error;
              }
              cur.value[1].dependsOn.push(dId);
            } else {
              const error = new Error(`Can't add dependency ${dependencyId}, There is only a dependent request in the batch`);
              error.name = "Invalid Dependency Addition";
              throw error;
            }
          }
        }
        /**
         * @public
         * Removes a dependency for a given dependent request id
         * @param {string} dependentId - The id of the dependent request
         * @param {string} [dependencyId] - The id of the dependency request, if not specified will remove all the dependencies of that request
         * @returns The boolean indicating removed status
         */
        removeDependency(dependentId, dependencyId) {
          const request = this.requests.get(dependentId);
          if (typeof request === "undefined" || request.dependsOn === void 0 || request.dependsOn.length === 0) {
            return false;
          }
          if (typeof dependencyId !== "undefined") {
            const index2 = request.dependsOn.indexOf(dependencyId);
            if (index2 === -1) {
              return false;
            }
            request.dependsOn.splice(index2, 1);
            return true;
          } else {
            delete request.dependsOn;
            return true;
          }
        }
      };
      BatchRequestContent.requestLimit = 20;
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/content/BatchResponseContent.js
  var init_BatchResponseContent = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/content/BatchResponseContent.js"() {
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Constants.js
  var GRAPH_API_VERSION, GRAPH_BASE_URL, GRAPH_URLS;
  var init_Constants = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Constants.js"() {
      GRAPH_API_VERSION = "v1.0";
      GRAPH_BASE_URL = "https://graph.microsoft.com/";
      GRAPH_URLS = /* @__PURE__ */ new Set(["graph.microsoft.com", "graph.microsoft.us", "dod-graph.microsoft.us", "graph.microsoft.de", "microsoftgraph.chinacloudapi.cn", "canary.graph.microsoft.com"]);
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphClientError.js
  var GraphClientError;
  var init_GraphClientError = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphClientError.js"() {
      GraphClientError = class _GraphClientError extends Error {
        /**
         * @public
         * @static
         * @async
         * To set the GraphClientError object
         * @param {any} error - The error returned encountered by the Graph JavaScript Client SDK while processing request
         * @returns GraphClientError object set to the error passed
         */
        static setGraphClientError(error) {
          let graphClientError;
          if (error instanceof Error) {
            graphClientError = error;
          } else {
            graphClientError = new _GraphClientError();
            graphClientError.customError = error;
          }
          return graphClientError;
        }
        /**
         * @public
         * @constructor
         * Creates an instance of GraphClientError
         * @param {string} message? - Error message
         * @returns An instance of GraphClientError
         */
        constructor(message) {
          super(message);
          Object.setPrototypeOf(this, _GraphClientError.prototype);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphRequestUtil.js
  var oDataQueryNames, urlJoin, serializeContent, isGraphURL, isCustomHost, isValidEndpoint, isCustomHostValid;
  var init_GraphRequestUtil = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphRequestUtil.js"() {
      init_Constants();
      init_GraphClientError();
      oDataQueryNames = ["$select", "$expand", "$orderby", "$filter", "$top", "$skip", "$skipToken", "$count"];
      urlJoin = (urlSegments) => {
        const removePostSlash = (s) => s.replace(/\/+$/, "");
        const removePreSlash = (s) => s.replace(/^\/+/, "");
        const joiner = (pre, cur) => [removePostSlash(pre), removePreSlash(cur)].join("/");
        const parts = Array.prototype.slice.call(urlSegments);
        return parts.reduce(joiner);
      };
      serializeContent = (content) => {
        const className = content && content.constructor && content.constructor.name;
        if (className === "Buffer" || className === "Blob" || className === "File" || className === "FormData" || typeof content === "string") {
          return content;
        }
        if (className === "ArrayBuffer") {
          content = Buffer.from(content);
        } else if (className === "Int8Array" || className === "Int16Array" || className === "Int32Array" || className === "Uint8Array" || className === "Uint16Array" || className === "Uint32Array" || className === "Uint8ClampedArray" || className === "Float32Array" || className === "Float64Array" || className === "DataView") {
          content = Buffer.from(content.buffer);
        } else {
          try {
            content = JSON.stringify(content);
          } catch (error) {
            throw new Error("Unable to stringify the content");
          }
        }
        return content;
      };
      isGraphURL = (url) => {
        return isValidEndpoint(url);
      };
      isCustomHost = (url, customHosts) => {
        customHosts.forEach((host) => isCustomHostValid(host));
        return isValidEndpoint(url, customHosts);
      };
      isValidEndpoint = (url, allowedHosts = GRAPH_URLS) => {
        url = url.toLowerCase();
        if (url.indexOf("https://") !== -1) {
          url = url.replace("https://", "");
          const startofPortNoPos = url.indexOf(":");
          const endOfHostStrPos = url.indexOf("/");
          let hostName = "";
          if (endOfHostStrPos !== -1) {
            if (startofPortNoPos !== -1 && startofPortNoPos < endOfHostStrPos) {
              hostName = url.substring(0, startofPortNoPos);
              return allowedHosts.has(hostName);
            }
            hostName = url.substring(0, endOfHostStrPos);
            return allowedHosts.has(hostName);
          }
        }
        return false;
      };
      isCustomHostValid = (host) => {
        if (host.indexOf("/") !== -1) {
          throw new GraphClientError("Please add only hosts or hostnames to the CustomHosts config. If the url is `http://example.com:3000/`, host is `example:3000`");
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareControl.js
  var MiddlewareControl;
  var init_MiddlewareControl = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareControl.js"() {
      MiddlewareControl = class {
        /**
         * @public
         * @constructor
         * Creates an instance of MiddlewareControl
         * @param {MiddlewareOptions[]} [middlewareOptions = []] - The array of middlewareOptions
         * @returns The instance of MiddlewareControl
         */
        constructor(middlewareOptions = []) {
          this.middlewareOptions = /* @__PURE__ */ new Map();
          for (const option of middlewareOptions) {
            const fn = option.constructor;
            this.middlewareOptions.set(fn, option);
          }
        }
        /**
         * @public
         * To get the middleware option using the class of the option
         * @param {Function} fn - The class of the strongly typed option class
         * @returns The middleware option
         * @example
         * // if you wanted to return the middleware option associated with this class (MiddlewareControl)
         * // call this function like this:
         * getMiddlewareOptions(MiddlewareControl)
         */
        getMiddlewareOptions(fn) {
          return this.middlewareOptions.get(fn);
        }
        /**
         * @public
         * To set the middleware options using the class of the option
         * @param {Function} fn - The class of the strongly typed option class
         * @param {MiddlewareOptions} option - The strongly typed middleware option
         * @returns nothing
         */
        setMiddlewareOptions(fn, option) {
          this.middlewareOptions.set(fn, option);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareUtil.js
  var generateUUID, getRequestHeader, setRequestHeader, appendRequestHeader, cloneRequestWithNewUrl;
  var init_MiddlewareUtil = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareUtil.js"() {
      init_tslib_es6();
      generateUUID = () => {
        let uuid2 = "";
        for (let j = 0; j < 32; j++) {
          if (j === 8 || j === 12 || j === 16 || j === 20) {
            uuid2 += "-";
          }
          uuid2 += Math.floor(Math.random() * 16).toString(16);
        }
        return uuid2;
      };
      getRequestHeader = (request, options, key) => {
        let value = null;
        if (typeof Request !== "undefined" && request instanceof Request) {
          value = request.headers.get(key);
        } else if (typeof options !== "undefined" && options.headers !== void 0) {
          if (typeof Headers !== "undefined" && options.headers instanceof Headers) {
            value = options.headers.get(key);
          } else if (options.headers instanceof Array) {
            const headers = options.headers;
            for (let i = 0, l = headers.length; i < l; i++) {
              if (headers[i][0] === key) {
                value = headers[i][1];
                break;
              }
            }
          } else if (options.headers[key] !== void 0) {
            value = options.headers[key];
          }
        }
        return value;
      };
      setRequestHeader = (request, options, key, value) => {
        if (typeof Request !== "undefined" && request instanceof Request) {
          request.headers.set(key, value);
        } else if (typeof options !== "undefined") {
          if (options.headers === void 0) {
            options.headers = new Headers({
              [key]: value
            });
          } else {
            if (typeof Headers !== "undefined" && options.headers instanceof Headers) {
              options.headers.set(key, value);
            } else if (options.headers instanceof Array) {
              let i = 0;
              const l = options.headers.length;
              for (; i < l; i++) {
                const header = options.headers[i];
                if (header[0] === key) {
                  header[1] = value;
                  break;
                }
              }
              if (i === l) {
                options.headers.push([key, value]);
              }
            } else {
              Object.assign(options.headers, { [key]: value });
            }
          }
        }
      };
      appendRequestHeader = (request, options, key, value) => {
        if (typeof Request !== "undefined" && request instanceof Request) {
          request.headers.append(key, value);
        } else if (typeof options !== "undefined") {
          if (options.headers === void 0) {
            options.headers = new Headers({
              [key]: value
            });
          } else {
            if (typeof Headers !== "undefined" && options.headers instanceof Headers) {
              options.headers.append(key, value);
            } else if (options.headers instanceof Array) {
              options.headers.push([key, value]);
            } else if (options.headers === void 0) {
              options.headers = { [key]: value };
            } else if (options.headers[key] === void 0) {
              options.headers[key] = value;
            } else {
              options.headers[key] += `, ${value}`;
            }
          }
        }
      };
      cloneRequestWithNewUrl = (newUrl, request) => __awaiter9(void 0, void 0, void 0, function* () {
        const body = request.headers.get("Content-Type") ? yield request.blob() : yield Promise.resolve(void 0);
        const { method, headers, referrer, referrerPolicy, mode, credentials, cache, redirect, integrity, keepalive, signal } = request;
        return new Request(newUrl, { method, headers, body, referrer, referrerPolicy, mode, credentials, cache, redirect, integrity, keepalive, signal });
      });
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/AuthenticationHandlerOptions.js
  var AuthenticationHandlerOptions;
  var init_AuthenticationHandlerOptions = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/AuthenticationHandlerOptions.js"() {
      AuthenticationHandlerOptions = class {
        /**
         * @public
         * @constructor
         * To create an instance of AuthenticationHandlerOptions
         * @param {AuthenticationProvider} [authenticationProvider] - The authentication provider instance
         * @param {AuthenticationProviderOptions} [authenticationProviderOptions] - The authentication provider options instance
         * @returns An instance of AuthenticationHandlerOptions
         */
        constructor(authenticationProvider, authenticationProviderOptions) {
          this.authenticationProvider = authenticationProvider;
          this.authenticationProviderOptions = authenticationProviderOptions;
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/TelemetryHandlerOptions.js
  var FeatureUsageFlag, TelemetryHandlerOptions;
  var init_TelemetryHandlerOptions = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/TelemetryHandlerOptions.js"() {
      init_MiddlewareControl();
      (function(FeatureUsageFlag2) {
        FeatureUsageFlag2[FeatureUsageFlag2["NONE"] = 0] = "NONE";
        FeatureUsageFlag2[FeatureUsageFlag2["REDIRECT_HANDLER_ENABLED"] = 1] = "REDIRECT_HANDLER_ENABLED";
        FeatureUsageFlag2[FeatureUsageFlag2["RETRY_HANDLER_ENABLED"] = 2] = "RETRY_HANDLER_ENABLED";
        FeatureUsageFlag2[FeatureUsageFlag2["AUTHENTICATION_HANDLER_ENABLED"] = 4] = "AUTHENTICATION_HANDLER_ENABLED";
      })(FeatureUsageFlag || (FeatureUsageFlag = {}));
      TelemetryHandlerOptions = class _TelemetryHandlerOptions {
        constructor() {
          this.featureUsage = FeatureUsageFlag.NONE;
        }
        /**
         * @public
         * @static
         * To update the feature usage in the context object
         * @param {Context} context - The request context object containing middleware options
         * @param {FeatureUsageFlag} flag - The flag value
         * @returns nothing
         */
        static updateFeatureUsageFlag(context, flag) {
          let options;
          if (context.middlewareControl instanceof MiddlewareControl) {
            options = context.middlewareControl.getMiddlewareOptions(_TelemetryHandlerOptions);
          } else {
            context.middlewareControl = new MiddlewareControl();
          }
          if (typeof options === "undefined") {
            options = new _TelemetryHandlerOptions();
            context.middlewareControl.setMiddlewareOptions(_TelemetryHandlerOptions, options);
          }
          options.setFeatureUsage(flag);
        }
        /**
         * @private
         * To set the feature usage flag
         * @param {FeatureUsageFlag} flag - The flag value
         * @returns nothing
         */
        setFeatureUsage(flag) {
          this.featureUsage = this.featureUsage | flag;
        }
        /**
         * @public
         * To get the feature usage
         * @returns A feature usage flag as hexadecimal string
         */
        getFeatureUsage() {
          return this.featureUsage.toString(16);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/AuthenticationHandler.js
  var AuthenticationHandler;
  var init_AuthenticationHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/AuthenticationHandler.js"() {
      init_tslib_es6();
      init_GraphRequestUtil();
      init_MiddlewareControl();
      init_MiddlewareUtil();
      init_AuthenticationHandlerOptions();
      init_TelemetryHandlerOptions();
      AuthenticationHandler = class _AuthenticationHandler {
        /**
         * @public
         * @constructor
         * Creates an instance of AuthenticationHandler
         * @param {AuthenticationProvider} authenticationProvider - The authentication provider for the authentication handler
         */
        constructor(authenticationProvider) {
          this.authenticationProvider = authenticationProvider;
        }
        /**
         * @public
         * @async
         * To execute the current middleware
         * @param {Context} context - The context object of the request
         * @returns A Promise that resolves to nothing
         */
        execute(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = typeof context.request === "string" ? context.request : context.request.url;
            if (isGraphURL(url) || context.customHosts && isCustomHost(url, context.customHosts)) {
              let options;
              if (context.middlewareControl instanceof MiddlewareControl) {
                options = context.middlewareControl.getMiddlewareOptions(AuthenticationHandlerOptions);
              }
              let authenticationProvider;
              let authenticationProviderOptions;
              if (options) {
                authenticationProvider = options.authenticationProvider;
                authenticationProviderOptions = options.authenticationProviderOptions;
              }
              if (!authenticationProvider) {
                authenticationProvider = this.authenticationProvider;
              }
              const token = yield authenticationProvider.getAccessToken(authenticationProviderOptions);
              const bearerKey = `Bearer ${token}`;
              appendRequestHeader(context.request, context.options, _AuthenticationHandler.AUTHORIZATION_HEADER, bearerKey);
              TelemetryHandlerOptions.updateFeatureUsageFlag(context, FeatureUsageFlag.AUTHENTICATION_HANDLER_ENABLED);
            } else {
              if (context.options.headers) {
                delete context.options.headers[_AuthenticationHandler.AUTHORIZATION_HEADER];
              }
            }
            return yield this.nextMiddleware.execute(context);
          });
        }
        /**
         * @public
         * To set the next middleware in the chain
         * @param {Middleware} next - The middleware instance
         * @returns Nothing
         */
        setNext(next) {
          this.nextMiddleware = next;
        }
      };
      AuthenticationHandler.AUTHORIZATION_HEADER = "Authorization";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/HTTPMessageHandler.js
  var HTTPMessageHandler;
  var init_HTTPMessageHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/HTTPMessageHandler.js"() {
      init_tslib_es6();
      HTTPMessageHandler = class {
        /**
         * @public
         * @async
         * To execute the current middleware
         * @param {Context} context - The request context object
         * @returns A promise that resolves to nothing
         */
        execute(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            context.response = yield fetch(context.request, context.options);
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/RetryHandlerOptions.js
  var RetryHandlerOptions;
  var init_RetryHandlerOptions = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/RetryHandlerOptions.js"() {
      RetryHandlerOptions = class _RetryHandlerOptions {
        /**
         * @public
         * @constructor
         * To create an instance of RetryHandlerOptions
         * @param {number} [delay = RetryHandlerOptions.DEFAULT_DELAY] - The delay value in seconds
         * @param {number} [maxRetries = RetryHandlerOptions.DEFAULT_MAX_RETRIES] - The maxRetries value
         * @param {ShouldRetry} [shouldRetry = RetryHandlerOptions.DEFAULT_SHOULD_RETRY] - The shouldRetry callback function
         * @returns An instance of RetryHandlerOptions
         */
        constructor(delay = _RetryHandlerOptions.DEFAULT_DELAY, maxRetries = _RetryHandlerOptions.DEFAULT_MAX_RETRIES, shouldRetry = _RetryHandlerOptions.defaultShouldRetry) {
          if (delay > _RetryHandlerOptions.MAX_DELAY && maxRetries > _RetryHandlerOptions.MAX_MAX_RETRIES) {
            const error = new Error(`Delay and MaxRetries should not be more than ${_RetryHandlerOptions.MAX_DELAY} and ${_RetryHandlerOptions.MAX_MAX_RETRIES}`);
            error.name = "MaxLimitExceeded";
            throw error;
          } else if (delay > _RetryHandlerOptions.MAX_DELAY) {
            const error = new Error(`Delay should not be more than ${_RetryHandlerOptions.MAX_DELAY}`);
            error.name = "MaxLimitExceeded";
            throw error;
          } else if (maxRetries > _RetryHandlerOptions.MAX_MAX_RETRIES) {
            const error = new Error(`MaxRetries should not be more than ${_RetryHandlerOptions.MAX_MAX_RETRIES}`);
            error.name = "MaxLimitExceeded";
            throw error;
          } else if (delay < 0 && maxRetries < 0) {
            const error = new Error(`Delay and MaxRetries should not be negative`);
            error.name = "MinExpectationNotMet";
            throw error;
          } else if (delay < 0) {
            const error = new Error(`Delay should not be negative`);
            error.name = "MinExpectationNotMet";
            throw error;
          } else if (maxRetries < 0) {
            const error = new Error(`MaxRetries should not be negative`);
            error.name = "MinExpectationNotMet";
            throw error;
          }
          this.delay = Math.min(delay, _RetryHandlerOptions.MAX_DELAY);
          this.maxRetries = Math.min(maxRetries, _RetryHandlerOptions.MAX_MAX_RETRIES);
          this.shouldRetry = shouldRetry;
        }
        /**
         * @public
         * To get the maximum delay
         * @returns A maximum delay
         */
        getMaxDelay() {
          return _RetryHandlerOptions.MAX_DELAY;
        }
      };
      RetryHandlerOptions.DEFAULT_DELAY = 3;
      RetryHandlerOptions.DEFAULT_MAX_RETRIES = 3;
      RetryHandlerOptions.MAX_DELAY = 180;
      RetryHandlerOptions.MAX_MAX_RETRIES = 10;
      RetryHandlerOptions.defaultShouldRetry = () => true;
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/RetryHandler.js
  var RetryHandler;
  var init_RetryHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/RetryHandler.js"() {
      init_tslib_es6();
      init_RequestMethod();
      init_MiddlewareControl();
      init_MiddlewareUtil();
      init_RetryHandlerOptions();
      init_TelemetryHandlerOptions();
      RetryHandler = class _RetryHandler {
        /**
         * @public
         * @constructor
         * To create an instance of RetryHandler
         * @param {RetryHandlerOptions} [options = new RetryHandlerOptions()] - The retry handler options value
         * @returns An instance of RetryHandler
         */
        constructor(options = new RetryHandlerOptions()) {
          this.options = options;
        }
        /**
         *
         * @private
         * To check whether the response has the retry status code
         * @param {Response} response - The response object
         * @returns Whether the response has retry status code or not
         */
        isRetry(response) {
          return _RetryHandler.RETRY_STATUS_CODES.indexOf(response.status) !== -1;
        }
        /**
         * @private
         * To check whether the payload is buffered or not
         * @param {RequestInfo} request - The url string or the request object value
         * @param {FetchOptions} options - The options of a request
         * @returns Whether the payload is buffered or not
         */
        isBuffered(request, options) {
          const method = typeof request === "string" ? options.method : request.method;
          const isPutPatchOrPost = method === RequestMethod.PUT || method === RequestMethod.PATCH || method === RequestMethod.POST;
          if (isPutPatchOrPost) {
            const isStream = getRequestHeader(request, options, "Content-Type") === "application/octet-stream";
            if (isStream) {
              return false;
            }
          }
          return true;
        }
        /**
         * @private
         * To get the delay for a retry
         * @param {Response} response - The response object
         * @param {number} retryAttempts - The current attempt count
         * @param {number} delay - The delay value in seconds
         * @returns A delay for a retry
         */
        getDelay(response, retryAttempts, delay) {
          const getRandomness = () => Number(Math.random().toFixed(3));
          const retryAfter = response.headers !== void 0 ? response.headers.get(_RetryHandler.RETRY_AFTER_HEADER) : null;
          let newDelay;
          if (retryAfter !== null) {
            if (Number.isNaN(Number(retryAfter))) {
              newDelay = Math.round((new Date(retryAfter).getTime() - Date.now()) / 1e3);
            } else {
              newDelay = Number(retryAfter);
            }
          } else {
            newDelay = retryAttempts >= 2 ? this.getExponentialBackOffTime(retryAttempts) + delay + getRandomness() : delay + getRandomness();
          }
          return Math.min(newDelay, this.options.getMaxDelay() + getRandomness());
        }
        /**
         * @private
         * To get an exponential back off value
         * @param {number} attempts - The current attempt count
         * @returns An exponential back off value
         */
        getExponentialBackOffTime(attempts) {
          return Math.round(1 / 2 * (Math.pow(2, attempts) - 1));
        }
        /**
         * @private
         * @async
         * To add delay for the execution
         * @param {number} delaySeconds - The delay value in seconds
         * @returns Nothing
         */
        sleep(delaySeconds) {
          return __awaiter9(this, void 0, void 0, function* () {
            const delayMilliseconds = delaySeconds * 1e3;
            return new Promise((resolve) => setTimeout(resolve, delayMilliseconds));
          });
        }
        getOptions(context) {
          let options;
          if (context.middlewareControl instanceof MiddlewareControl) {
            options = context.middlewareControl.getMiddlewareOptions(this.options.constructor);
          }
          if (typeof options === "undefined") {
            options = Object.assign(new RetryHandlerOptions(), this.options);
          }
          return options;
        }
        /**
         * @private
         * @async
         * To execute the middleware with retries
         * @param {Context} context - The context object
         * @param {number} retryAttempts - The current attempt count
         * @param {RetryHandlerOptions} options - The retry middleware options instance
         * @returns A Promise that resolves to nothing
         */
        executeWithRetry(context, retryAttempts, options) {
          return __awaiter9(this, void 0, void 0, function* () {
            yield this.nextMiddleware.execute(context);
            if (retryAttempts < options.maxRetries && this.isRetry(context.response) && this.isBuffered(context.request, context.options) && options.shouldRetry(options.delay, retryAttempts, context.request, context.options, context.response)) {
              ++retryAttempts;
              setRequestHeader(context.request, context.options, _RetryHandler.RETRY_ATTEMPT_HEADER, retryAttempts.toString());
              const delay = this.getDelay(context.response, retryAttempts, options.delay);
              yield this.sleep(delay);
              return yield this.executeWithRetry(context, retryAttempts, options);
            } else {
              return;
            }
          });
        }
        /**
         * @public
         * @async
         * To execute the current middleware
         * @param {Context} context - The context object of the request
         * @returns A Promise that resolves to nothing
         */
        execute(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            const retryAttempts = 0;
            const options = this.getOptions(context);
            TelemetryHandlerOptions.updateFeatureUsageFlag(context, FeatureUsageFlag.RETRY_HANDLER_ENABLED);
            return yield this.executeWithRetry(context, retryAttempts, options);
          });
        }
        /**
         * @public
         * To set the next middleware in the chain
         * @param {Middleware} next - The middleware instance
         * @returns Nothing
         */
        setNext(next) {
          this.nextMiddleware = next;
        }
      };
      RetryHandler.RETRY_STATUS_CODES = [
        429,
        503,
        504
        // Gateway timeout
      ];
      RetryHandler.RETRY_ATTEMPT_HEADER = "Retry-Attempt";
      RetryHandler.RETRY_AFTER_HEADER = "Retry-After";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/RedirectHandlerOptions.js
  var RedirectHandlerOptions;
  var init_RedirectHandlerOptions = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/RedirectHandlerOptions.js"() {
      RedirectHandlerOptions = class _RedirectHandlerOptions {
        /**
         * @public
         * @constructor
         * To create an instance of RedirectHandlerOptions
         * @param {number} [maxRedirects = RedirectHandlerOptions.DEFAULT_MAX_REDIRECTS] - The max redirects value
         * @param {ShouldRedirect} [shouldRedirect = RedirectHandlerOptions.DEFAULT_SHOULD_RETRY] - The should redirect callback
         * @returns An instance of RedirectHandlerOptions
         */
        constructor(maxRedirects = _RedirectHandlerOptions.DEFAULT_MAX_REDIRECTS, shouldRedirect = _RedirectHandlerOptions.defaultShouldRedirect) {
          if (maxRedirects > _RedirectHandlerOptions.MAX_MAX_REDIRECTS) {
            const error = new Error(`MaxRedirects should not be more than ${_RedirectHandlerOptions.MAX_MAX_REDIRECTS}`);
            error.name = "MaxLimitExceeded";
            throw error;
          }
          if (maxRedirects < 0) {
            const error = new Error(`MaxRedirects should not be negative`);
            error.name = "MinExpectationNotMet";
            throw error;
          }
          this.maxRedirects = maxRedirects;
          this.shouldRedirect = shouldRedirect;
        }
      };
      RedirectHandlerOptions.DEFAULT_MAX_REDIRECTS = 5;
      RedirectHandlerOptions.MAX_MAX_REDIRECTS = 20;
      RedirectHandlerOptions.defaultShouldRedirect = () => true;
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/RedirectHandler.js
  var RedirectHandler;
  var init_RedirectHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/RedirectHandler.js"() {
      init_tslib_es6();
      init_RequestMethod();
      init_MiddlewareControl();
      init_MiddlewareUtil();
      init_RedirectHandlerOptions();
      init_TelemetryHandlerOptions();
      RedirectHandler = class _RedirectHandler {
        /**
         * @public
         * @constructor
         * To create an instance of RedirectHandler
         * @param {RedirectHandlerOptions} [options = new RedirectHandlerOptions()] - The redirect handler options instance
         * @returns An instance of RedirectHandler
         */
        constructor(options = new RedirectHandlerOptions()) {
          this.options = options;
        }
        /**
         * @private
         * To check whether the response has the redirect status code or not
         * @param {Response} response - The response object
         * @returns A boolean representing whether the response contains the redirect status code or not
         */
        isRedirect(response) {
          return _RedirectHandler.REDIRECT_STATUS_CODES.indexOf(response.status) !== -1;
        }
        /**
         * @private
         * To check whether the response has location header or not
         * @param {Response} response - The response object
         * @returns A boolean representing the whether the response has location header or not
         */
        hasLocationHeader(response) {
          return response.headers.has(_RedirectHandler.LOCATION_HEADER);
        }
        /**
         * @private
         * To get the redirect url from location header in response object
         * @param {Response} response - The response object
         * @returns A redirect url from location header
         */
        getLocationHeader(response) {
          return response.headers.get(_RedirectHandler.LOCATION_HEADER);
        }
        /**
         * @private
         * To check whether the given url is a relative url or not
         * @param {string} url - The url string value
         * @returns A boolean representing whether the given url is a relative url or not
         */
        isRelativeURL(url) {
          return url.indexOf("://") === -1;
        }
        /**
         * @private
         * To check whether the authorization header in the request should be dropped for consequent redirected requests
         * @param {string} requestUrl - The request url value
         * @param {string} redirectUrl - The redirect url value
         * @returns A boolean representing whether the authorization header in the request should be dropped for consequent redirected requests
         */
        shouldDropAuthorizationHeader(requestUrl, redirectUrl) {
          const schemeHostRegex = /^[A-Za-z].+?:\/\/.+?(?=\/|$)/;
          const requestMatches = schemeHostRegex.exec(requestUrl);
          let requestAuthority;
          let redirectAuthority;
          if (requestMatches !== null) {
            requestAuthority = requestMatches[0];
          }
          const redirectMatches = schemeHostRegex.exec(redirectUrl);
          if (redirectMatches !== null) {
            redirectAuthority = redirectMatches[0];
          }
          return typeof requestAuthority !== "undefined" && typeof redirectAuthority !== "undefined" && requestAuthority !== redirectAuthority;
        }
        /**
         * @private
         * @async
         * To update a request url with the redirect url
         * @param {string} redirectUrl - The redirect url value
         * @param {Context} context - The context object value
         * @returns Nothing
         */
        updateRequestUrl(redirectUrl, context) {
          return __awaiter9(this, void 0, void 0, function* () {
            context.request = typeof context.request === "string" ? redirectUrl : yield cloneRequestWithNewUrl(redirectUrl, context.request);
          });
        }
        /**
         * @private
         * To get the options for execution of the middleware
         * @param {Context} context - The context object
         * @returns A options for middleware execution
         */
        getOptions(context) {
          let options;
          if (context.middlewareControl instanceof MiddlewareControl) {
            options = context.middlewareControl.getMiddlewareOptions(RedirectHandlerOptions);
          }
          if (typeof options === "undefined") {
            options = Object.assign(new RedirectHandlerOptions(), this.options);
          }
          return options;
        }
        /**
         * @private
         * @async
         * To execute the next middleware and to handle in case of redirect response returned by the server
         * @param {Context} context - The context object
         * @param {number} redirectCount - The redirect count value
         * @param {RedirectHandlerOptions} options - The redirect handler options instance
         * @returns A promise that resolves to nothing
         */
        executeWithRedirect(context, redirectCount, options) {
          return __awaiter9(this, void 0, void 0, function* () {
            yield this.nextMiddleware.execute(context);
            const response = context.response;
            if (redirectCount < options.maxRedirects && this.isRedirect(response) && this.hasLocationHeader(response) && options.shouldRedirect(response)) {
              ++redirectCount;
              if (response.status === _RedirectHandler.STATUS_CODE_SEE_OTHER) {
                context.options.method = RequestMethod.GET;
                delete context.options.body;
              } else {
                const redirectUrl = this.getLocationHeader(response);
                if (!this.isRelativeURL(redirectUrl) && this.shouldDropAuthorizationHeader(response.url, redirectUrl)) {
                  delete context.options.headers[_RedirectHandler.AUTHORIZATION_HEADER];
                }
                yield this.updateRequestUrl(redirectUrl, context);
              }
              yield this.executeWithRedirect(context, redirectCount, options);
            } else {
              return;
            }
          });
        }
        /**
         * @public
         * @async
         * To execute the current middleware
         * @param {Context} context - The context object of the request
         * @returns A Promise that resolves to nothing
         */
        execute(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            const redirectCount = 0;
            const options = this.getOptions(context);
            context.options.redirect = _RedirectHandler.MANUAL_REDIRECT;
            TelemetryHandlerOptions.updateFeatureUsageFlag(context, FeatureUsageFlag.REDIRECT_HANDLER_ENABLED);
            return yield this.executeWithRedirect(context, redirectCount, options);
          });
        }
        /**
         * @public
         * To set the next middleware in the chain
         * @param {Middleware} next - The middleware instance
         * @returns Nothing
         */
        setNext(next) {
          this.nextMiddleware = next;
        }
      };
      RedirectHandler.REDIRECT_STATUS_CODES = [
        301,
        302,
        303,
        307,
        308
        // Moved Permanently
      ];
      RedirectHandler.STATUS_CODE_SEE_OTHER = 303;
      RedirectHandler.LOCATION_HEADER = "Location";
      RedirectHandler.AUTHORIZATION_HEADER = "Authorization";
      RedirectHandler.MANUAL_REDIRECT = "manual";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Version.js
  var PACKAGE_VERSION;
  var init_Version = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Version.js"() {
      PACKAGE_VERSION = "3.0.7";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/TelemetryHandler.js
  var TelemetryHandler;
  var init_TelemetryHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/TelemetryHandler.js"() {
      init_tslib_es6();
      init_GraphRequestUtil();
      init_Version();
      init_MiddlewareControl();
      init_MiddlewareUtil();
      init_TelemetryHandlerOptions();
      TelemetryHandler = class _TelemetryHandler {
        /**
         * @public
         * @async
         * To execute the current middleware
         * @param {Context} context - The context object of the request
         * @returns A Promise that resolves to nothing
         */
        execute(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = typeof context.request === "string" ? context.request : context.request.url;
            if (isGraphURL(url) || context.customHosts && isCustomHost(url, context.customHosts)) {
              let clientRequestId = getRequestHeader(context.request, context.options, _TelemetryHandler.CLIENT_REQUEST_ID_HEADER);
              if (!clientRequestId) {
                clientRequestId = generateUUID();
                setRequestHeader(context.request, context.options, _TelemetryHandler.CLIENT_REQUEST_ID_HEADER, clientRequestId);
              }
              let sdkVersionValue = `${_TelemetryHandler.PRODUCT_NAME}/${PACKAGE_VERSION}`;
              let options;
              if (context.middlewareControl instanceof MiddlewareControl) {
                options = context.middlewareControl.getMiddlewareOptions(TelemetryHandlerOptions);
              }
              if (options) {
                const featureUsage = options.getFeatureUsage();
                sdkVersionValue += ` (${_TelemetryHandler.FEATURE_USAGE_STRING}=${featureUsage})`;
              }
              appendRequestHeader(context.request, context.options, _TelemetryHandler.SDK_VERSION_HEADER, sdkVersionValue);
            } else {
              delete context.options.headers[_TelemetryHandler.CLIENT_REQUEST_ID_HEADER];
              delete context.options.headers[_TelemetryHandler.SDK_VERSION_HEADER];
            }
            return yield this.nextMiddleware.execute(context);
          });
        }
        /**
         * @public
         * To set the next middleware in the chain
         * @param {Middleware} next - The middleware instance
         * @returns Nothing
         */
        setNext(next) {
          this.nextMiddleware = next;
        }
      };
      TelemetryHandler.CLIENT_REQUEST_ID_HEADER = "client-request-id";
      TelemetryHandler.SDK_VERSION_HEADER = "SdkVersion";
      TelemetryHandler.PRODUCT_NAME = "graph-js";
      TelemetryHandler.FEATURE_USAGE_STRING = "featureUsage";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareFactory.js
  var init_MiddlewareFactory = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/MiddlewareFactory.js"() {
      init_AuthenticationHandler();
      init_HTTPMessageHandler();
      init_RedirectHandlerOptions();
      init_RetryHandlerOptions();
      init_RedirectHandler();
      init_RetryHandler();
      init_TelemetryHandler();
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosStrategy.js
  var ChaosStrategy;
  var init_ChaosStrategy = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosStrategy.js"() {
      (function(ChaosStrategy2) {
        ChaosStrategy2[ChaosStrategy2["MANUAL"] = 0] = "MANUAL";
        ChaosStrategy2[ChaosStrategy2["RANDOM"] = 1] = "RANDOM";
      })(ChaosStrategy || (ChaosStrategy = {}));
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosHandlerOptions.js
  var init_ChaosHandlerOptions = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosHandlerOptions.js"() {
      init_ChaosStrategy();
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosHandlerData.js
  var init_ChaosHandlerData = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/options/ChaosHandlerData.js"() {
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/ChaosHandler.js
  var init_ChaosHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/middleware/ChaosHandler.js"() {
      init_MiddlewareControl();
      init_MiddlewareUtil();
      init_ChaosHandlerData();
      init_ChaosHandlerOptions();
      init_ChaosStrategy();
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/ResponseType.js
  var ResponseType;
  var init_ResponseType = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/ResponseType.js"() {
      (function(ResponseType2) {
        ResponseType2["ARRAYBUFFER"] = "arraybuffer";
        ResponseType2["BLOB"] = "blob";
        ResponseType2["DOCUMENT"] = "document";
        ResponseType2["JSON"] = "json";
        ResponseType2["RAW"] = "raw";
        ResponseType2["STREAM"] = "stream";
        ResponseType2["TEXT"] = "text";
      })(ResponseType || (ResponseType = {}));
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphResponseHandler.js
  var DocumentType, ContentType, ContentTypeRegexStr, GraphResponseHandler;
  var init_GraphResponseHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphResponseHandler.js"() {
      init_tslib_es6();
      init_ResponseType();
      (function(DocumentType2) {
        DocumentType2["TEXT_HTML"] = "text/html";
        DocumentType2["TEXT_XML"] = "text/xml";
        DocumentType2["APPLICATION_XML"] = "application/xml";
        DocumentType2["APPLICATION_XHTML"] = "application/xhtml+xml";
      })(DocumentType || (DocumentType = {}));
      (function(ContentType2) {
        ContentType2["TEXT_PLAIN"] = "text/plain";
        ContentType2["APPLICATION_JSON"] = "application/json";
      })(ContentType || (ContentType = {}));
      (function(ContentTypeRegexStr2) {
        ContentTypeRegexStr2["DOCUMENT"] = "^(text\\/(html|xml))|(application\\/(xml|xhtml\\+xml))$";
        ContentTypeRegexStr2["IMAGE"] = "^image\\/.+";
      })(ContentTypeRegexStr || (ContentTypeRegexStr = {}));
      GraphResponseHandler = class _GraphResponseHandler {
        /**
         * @private
         * @static
         * To parse Document response
         * @param {Response} rawResponse - The response object
         * @param {DocumentType} type - The type to which the document needs to be parsed
         * @returns A promise that resolves to a document content
         */
        static parseDocumentResponse(rawResponse, type) {
          if (typeof DOMParser !== "undefined") {
            return new Promise((resolve, reject) => {
              rawResponse.text().then((xmlString) => {
                try {
                  const parser = new DOMParser();
                  const xmlDoc = parser.parseFromString(xmlString, type);
                  resolve(xmlDoc);
                } catch (error) {
                  reject(error);
                }
              });
            });
          } else {
            return Promise.resolve(rawResponse.body);
          }
        }
        /**
         * @private
         * @static
         * @async
         * To convert the native Response to response content
         * @param {Response} rawResponse - The response object
         * @param {ResponseType} [responseType] - The response type value
         * @returns A promise that resolves to the converted response content
         */
        static convertResponse(rawResponse, responseType) {
          return __awaiter9(this, void 0, void 0, function* () {
            if (rawResponse.status === 204) {
              return Promise.resolve();
            }
            let responseValue;
            const contentType = rawResponse.headers.get("Content-type");
            switch (responseType) {
              case ResponseType.ARRAYBUFFER:
                responseValue = yield rawResponse.arrayBuffer();
                break;
              case ResponseType.BLOB:
                responseValue = yield rawResponse.blob();
                break;
              case ResponseType.DOCUMENT:
                responseValue = yield _GraphResponseHandler.parseDocumentResponse(rawResponse, DocumentType.TEXT_XML);
                break;
              case ResponseType.JSON:
                responseValue = yield rawResponse.json();
                break;
              case ResponseType.STREAM:
                responseValue = yield Promise.resolve(rawResponse.body);
                break;
              case ResponseType.TEXT:
                responseValue = yield rawResponse.text();
                break;
              default:
                if (contentType !== null) {
                  const mimeType = contentType.split(";")[0];
                  if (new RegExp(ContentTypeRegexStr.DOCUMENT).test(mimeType)) {
                    responseValue = yield _GraphResponseHandler.parseDocumentResponse(rawResponse, mimeType);
                  } else if (new RegExp(ContentTypeRegexStr.IMAGE).test(mimeType)) {
                    responseValue = rawResponse.blob();
                  } else if (mimeType === ContentType.TEXT_PLAIN) {
                    responseValue = yield rawResponse.text();
                  } else if (mimeType === ContentType.APPLICATION_JSON) {
                    responseValue = yield rawResponse.json();
                  } else {
                    responseValue = Promise.resolve(rawResponse.body);
                  }
                } else {
                  responseValue = Promise.resolve(rawResponse.body);
                }
                break;
            }
            return responseValue;
          });
        }
        /**
         * @public
         * @static
         * @async
         * To get the parsed response
         * @param {Response} rawResponse - The response object
         * @param {ResponseType} [responseType] - The response type value
         * @param {GraphRequestCallback} [callback] - The graph request callback function
         * @returns The parsed response
         */
        static getResponse(rawResponse, responseType, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            if (responseType === ResponseType.RAW) {
              return Promise.resolve(rawResponse);
            } else {
              const response = yield _GraphResponseHandler.convertResponse(rawResponse, responseType);
              if (rawResponse.ok) {
                if (typeof callback === "function") {
                  callback(null, response);
                } else {
                  return response;
                }
              } else {
                throw response;
              }
            }
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/Range.js
  var Range;
  var init_Range = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/Range.js"() {
      Range = class {
        /**
         * @public
         * @constructor
         * Creates a range for given min and max values
         * @param {number} [minVal = -1] - The minimum value.
         * @param {number} [maxVal = -1] - The maximum value.
         * @returns An instance of a Range
         */
        constructor(minVal = -1, maxVal = -1) {
          this.minValue = minVal;
          this.maxValue = maxVal;
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/UploadResult.js
  var UploadResult;
  var init_UploadResult = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/UploadResult.js"() {
      UploadResult = class _UploadResult {
        /**
         * @public
         * Get of the location value.
         * Location value is looked up in the response header
         */
        get location() {
          return this._location;
        }
        /**
         * @public
         * Set the location value
         * Location value is looked up in the response header
         */
        set location(location) {
          this._location = location;
        }
        /**
         * @public
         * Get The response body from the completed upload response
         */
        get responseBody() {
          return this._responseBody;
        }
        /**
         * @public
         * Set the response body from the completed upload response
         */
        set responseBody(responseBody) {
          this._responseBody = responseBody;
        }
        /**
         * @public
         * @param {responseBody} responsebody - The response body from the completed upload response
         * @param {location} location - The location value from the headers from the completed upload response
         */
        constructor(responseBody, location) {
          this._location = location;
          this._responseBody = responseBody;
        }
        /**
         * @public
         * @param {responseBody} responseBody - The response body from the completed upload response
         * @param {responseHeaders} responseHeaders - The headers from the completed upload response
         */
        static CreateUploadResult(responseBody, responseHeaders) {
          return new _UploadResult(responseBody, responseHeaders.get("location"));
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/LargeFileUploadTask.js
  var LargeFileUploadTask;
  var init_LargeFileUploadTask = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/LargeFileUploadTask.js"() {
      init_tslib_es6();
      init_GraphClientError();
      init_GraphResponseHandler();
      init_ResponseType();
      init_Range();
      init_UploadResult();
      LargeFileUploadTask = class {
        /**
         * @public
         * @static
         * @async
         * Makes request to the server to create an upload session
         * @param {Client} client - The GraphClient instance
         * @param {string} requestUrl - The URL to create the upload session
         * @param {any} payload - The payload that needs to be sent
         * @param {KeyValuePairObjectStringNumber} headers - The headers that needs to be sent
         * @returns The promise that resolves to LargeFileUploadSession
         */
        static createUploadSession(client, requestUrl, payload, headers = {}) {
          return __awaiter9(this, void 0, void 0, function* () {
            const session = yield client.api(requestUrl).headers(headers).post(payload);
            const largeFileUploadSession = {
              url: session.uploadUrl,
              expiry: new Date(session.expirationDateTime),
              isCancelled: false
            };
            return largeFileUploadSession;
          });
        }
        /**
         * @public
         * @constructor
         * Constructs a LargeFileUploadTask
         * @param {Client} client - The GraphClient instance
         * @param {FileObject} file - The FileObject holding details of a file that needs to be uploaded
         * @param {LargeFileUploadSession} uploadSession - The upload session to which the upload has to be done
         * @param {LargeFileUploadTaskOptions} options - The upload task options
         * @returns An instance of LargeFileUploadTask
         */
        constructor(client, file, uploadSession, options = {}) {
          this.DEFAULT_FILE_SIZE = 5 * 1024 * 1024;
          this.client = client;
          if (!file.sliceFile) {
            throw new GraphClientError("Please pass the FileUpload object, StreamUpload object or any custom implementation of the FileObject interface");
          } else {
            this.file = file;
          }
          this.file = file;
          if (!options.rangeSize) {
            options.rangeSize = this.DEFAULT_FILE_SIZE;
          }
          this.options = options;
          this.uploadSession = uploadSession;
          this.nextRange = new Range(0, this.options.rangeSize - 1);
        }
        /**
         * @private
         * Parses given range string to the Range instance
         * @param {string[]} ranges - The ranges value
         * @returns The range instance
         */
        parseRange(ranges) {
          const rangeStr = ranges[0];
          if (typeof rangeStr === "undefined" || rangeStr === "") {
            return new Range();
          }
          const firstRange = rangeStr.split("-");
          const minVal = parseInt(firstRange[0], 10);
          let maxVal = parseInt(firstRange[1], 10);
          if (Number.isNaN(maxVal)) {
            maxVal = this.file.size - 1;
          }
          return new Range(minVal, maxVal);
        }
        /**
         * @private
         * Updates the expiration date and the next range
         * @param {UploadStatusResponse} response - The response of the upload status
         * @returns Nothing
         */
        updateTaskStatus(response) {
          this.uploadSession.expiry = new Date(response.expirationDateTime);
          this.nextRange = this.parseRange(response.nextExpectedRanges);
        }
        /**
         * @public
         * Gets next range that needs to be uploaded
         * @returns The range instance
         */
        getNextRange() {
          if (this.nextRange.minValue === -1) {
            return this.nextRange;
          }
          const minVal = this.nextRange.minValue;
          let maxValue = minVal + this.options.rangeSize - 1;
          if (maxValue >= this.file.size) {
            maxValue = this.file.size - 1;
          }
          return new Range(minVal, maxValue);
        }
        /**
         * @deprecated This function has been moved into FileObject interface.
         * @public
         * Slices the file content to the given range
         * @param {Range} range - The range value
         * @returns The sliced ArrayBuffer or Blob
         */
        sliceFile(range) {
          console.warn("The LargeFileUploadTask.sliceFile() function has been deprecated and moved into the FileObject interface.");
          if (this.file.content instanceof ArrayBuffer || this.file.content instanceof Blob || this.file.content instanceof Uint8Array) {
            return this.file.content.slice(range.minValue, range.maxValue + 1);
          }
          throw new GraphClientError("The LargeFileUploadTask.sliceFile() function expects only Blob, ArrayBuffer or Uint8Array file content. Please note that the sliceFile() function is deprecated.");
        }
        /**
         * @public
         * @async
         * Uploads file to the server in a sequential order by slicing the file
         * @returns The promise resolves to uploaded response
         */
        upload() {
          return __awaiter9(this, void 0, void 0, function* () {
            const uploadEventHandlers = this.options && this.options.uploadEventHandlers;
            while (!this.uploadSession.isCancelled) {
              const nextRange = this.getNextRange();
              if (nextRange.maxValue === -1) {
                const err = new Error("Task with which you are trying to upload is already completed, Please check for your uploaded file");
                err.name = "Invalid Session";
                throw err;
              }
              const fileSlice = yield this.file.sliceFile(nextRange);
              const rawResponse = yield this.uploadSliceGetRawResponse(fileSlice, nextRange, this.file.size);
              if (!rawResponse) {
                throw new GraphClientError("Something went wrong! Large file upload slice response is null.");
              }
              const responseBody = yield GraphResponseHandler.getResponse(rawResponse);
              if (rawResponse.status === 201 || rawResponse.status === 200 && responseBody.id) {
                this.reportProgress(uploadEventHandlers, nextRange);
                return UploadResult.CreateUploadResult(responseBody, rawResponse.headers);
              }
              const res = {
                expirationDateTime: responseBody.expirationDateTime || responseBody.ExpirationDateTime,
                nextExpectedRanges: responseBody.NextExpectedRanges || responseBody.nextExpectedRanges
              };
              this.updateTaskStatus(res);
              this.reportProgress(uploadEventHandlers, nextRange);
            }
          });
        }
        reportProgress(uploadEventHandlers, nextRange) {
          if (uploadEventHandlers && uploadEventHandlers.progress) {
            uploadEventHandlers.progress(nextRange, uploadEventHandlers.extraCallbackParam);
          }
        }
        /**
         * @public
         * @async
         * Uploads given slice to the server
         * @param {ArrayBuffer | Blob | File} fileSlice - The file slice
         * @param {Range} range - The range value
         * @param {number} totalSize - The total size of a complete file
         * @returns The response body of the upload slice result
         */
        uploadSlice(fileSlice, range, totalSize) {
          return __awaiter9(this, void 0, void 0, function* () {
            return yield this.client.api(this.uploadSession.url).headers({
              "Content-Length": `${range.maxValue - range.minValue + 1}`,
              "Content-Range": `bytes ${range.minValue}-${range.maxValue}/${totalSize}`,
              "Content-Type": "application/octet-stream"
            }).put(fileSlice);
          });
        }
        /**
         * @public
         * @async
         * Uploads given slice to the server
         * @param {unknown} fileSlice - The file slice
         * @param {Range} range - The range value
         * @param {number} totalSize - The total size of a complete file
         * @returns The raw response of the upload slice result
         */
        uploadSliceGetRawResponse(fileSlice, range, totalSize) {
          return __awaiter9(this, void 0, void 0, function* () {
            return yield this.client.api(this.uploadSession.url).headers({
              "Content-Length": `${range.maxValue - range.minValue + 1}`,
              "Content-Range": `bytes ${range.minValue}-${range.maxValue}/${totalSize}`,
              "Content-Type": "application/octet-stream"
            }).responseType(ResponseType.RAW).put(fileSlice);
          });
        }
        /**
         * @public
         * @async
         * Deletes upload session in the server
         * @returns The promise resolves to cancelled response
         */
        cancel() {
          return __awaiter9(this, void 0, void 0, function* () {
            const cancelResponse = yield this.client.api(this.uploadSession.url).responseType(ResponseType.RAW).delete();
            if (cancelResponse.status === 204) {
              this.uploadSession.isCancelled = true;
            }
            return cancelResponse;
          });
        }
        /**
         * @public
         * @async
         * Gets status for the upload session
         * @returns The promise resolves to the status enquiry response
         */
        getStatus() {
          return __awaiter9(this, void 0, void 0, function* () {
            const response = yield this.client.api(this.uploadSession.url).get();
            this.updateTaskStatus(response);
            return response;
          });
        }
        /**
         * @public
         * @async
         * Resumes upload session and continue uploading the file from the last sent range
         * @returns The promise resolves to the uploaded response
         */
        resume() {
          return __awaiter9(this, void 0, void 0, function* () {
            yield this.getStatus();
            return yield this.upload();
          });
        }
        /**
         * @public
         * @async
         * Get the upload session information
         * @returns The large file upload session
         */
        getUploadSession() {
          return this.uploadSession;
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/FileObjectClasses/FileUpload.js
  var FileUpload;
  var init_FileUpload = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/FileObjectClasses/FileUpload.js"() {
      init_GraphClientError();
      FileUpload = class {
        /**
         * @public
         * @constructor
         * @param {ArrayBuffer | Blob | Uint8Array} content - The file to be uploaded
         * @param {string} name - The name of the file to be uploaded
         * @param {number} size - The total size of the file to be uploaded
         * @returns An instance of the FileUpload class
         */
        constructor(content, name, size) {
          this.content = content;
          this.name = name;
          this.size = size;
          if (!content || !name || !size) {
            throw new GraphClientError("Please provide the upload content, name of the file and size of the file");
          }
        }
        /**
         * @public
         * Slices the file content to the given range
         * @param {Range} range - The range value
         * @returns The sliced file part
         */
        sliceFile(range) {
          return this.content.slice(range.minValue, range.maxValue + 1);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/OneDriveLargeFileUploadTaskUtil.js
  var DEFAULT_FILE_SIZE, roundTo320KB, getValidRangeSize;
  var init_OneDriveLargeFileUploadTaskUtil = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/OneDriveLargeFileUploadTaskUtil.js"() {
      DEFAULT_FILE_SIZE = 5 * 1024 * 1024;
      roundTo320KB = (value) => {
        if (value > 320 * 1024) {
          value = Math.floor(value / (320 * 1024)) * 320 * 1024;
        }
        return value;
      };
      getValidRangeSize = (rangeSize = DEFAULT_FILE_SIZE) => {
        const sixtyMB = 60 * 1024 * 1024;
        if (rangeSize > sixtyMB) {
          rangeSize = sixtyMB;
        }
        return roundTo320KB(rangeSize);
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/OneDriveLargeFileUploadTask.js
  var OneDriveLargeFileUploadTask;
  var init_OneDriveLargeFileUploadTask = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/OneDriveLargeFileUploadTask.js"() {
      init_tslib_es6();
      init_GraphClientError();
      init_FileUpload();
      init_LargeFileUploadTask();
      init_OneDriveLargeFileUploadTaskUtil();
      OneDriveLargeFileUploadTask = class _OneDriveLargeFileUploadTask extends LargeFileUploadTask {
        /**
         * @private
         * @static
         * Constructs the create session url for Onedrive
         * @param {string} fileName - The name of the file
         * @param {path} [path = OneDriveLargeFileUploadTask.DEFAULT_UPLOAD_PATH] - The path for the upload
         * @returns The constructed create session url
         */
        static constructCreateSessionUrl(fileName, path = _OneDriveLargeFileUploadTask.DEFAULT_UPLOAD_PATH) {
          fileName = fileName.trim();
          path = path.trim();
          if (path === "") {
            path = "/";
          }
          if (path[0] !== "/") {
            path = `/${path}`;
          }
          if (path[path.length - 1] !== "/") {
            path = `${path}/`;
          }
          return `/me/drive/root:${path.split("/").map((p) => encodeURIComponent(p)).join("/")}${encodeURIComponent(fileName)}:/createUploadSession`;
        }
        /**
         * @private
         * @static
         * Get file information
         * @param {Blob | Uint8Array | File} file - The file entity
         * @param {string} fileName - The file name
         * @returns {FileInfo} The file information
         */
        static getFileInfo(file, fileName) {
          let content;
          let size;
          if (typeof Blob !== "undefined" && file instanceof Blob) {
            content = new File([file], fileName);
            size = content.size;
          } else if (typeof File !== "undefined" && file instanceof File) {
            content = file;
            size = content.size;
          } else if (typeof Uint8Array !== "undefined" && file instanceof Uint8Array) {
            const b = file;
            size = b.byteLength;
            content = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
          }
          return {
            content,
            size
          };
        }
        /**
         * @public
         * @static
         * @async
         * Creates a OneDriveLargeFileUploadTask
         * @param {Client} client - The GraphClient instance
         * @param {Blob | Uint8Array | File} file - File represented as Blob, Uint8Array or File
         * @param {OneDriveLargeFileUploadOptions} options - The options for upload task
         * @returns The promise that will be resolves to OneDriveLargeFileUploadTask instance
         */
        static create(client, file, options) {
          return __awaiter9(this, void 0, void 0, function* () {
            if (!client || !file || !options) {
              throw new GraphClientError("Please provide the Graph client instance, file object and OneDriveLargeFileUploadOptions value");
            }
            const fileName = options.fileName;
            const fileInfo = _OneDriveLargeFileUploadTask.getFileInfo(file, fileName);
            const fileObj = new FileUpload(fileInfo.content, fileName, fileInfo.size);
            return this.createTaskWithFileObject(client, fileObj, options);
          });
        }
        /**
         * @public
         * @static
         * @async
         * Creates a OneDriveLargeFileUploadTask
         * @param {Client} client - The GraphClient instance
         * @param {FileObject} fileObject - FileObject instance
         * @param {OneDriveLargeFileUploadOptions} options - The options for upload task
         * @returns The promise that will be resolves to OneDriveLargeFileUploadTask instance
         */
        static createTaskWithFileObject(client, fileObject, options) {
          return __awaiter9(this, void 0, void 0, function* () {
            if (!client || !fileObject || !options) {
              throw new GraphClientError("Please provide the Graph client instance, FileObject interface implementation and OneDriveLargeFileUploadOptions value");
            }
            const requestUrl = options.uploadSessionURL ? options.uploadSessionURL : _OneDriveLargeFileUploadTask.constructCreateSessionUrl(options.fileName, options.path);
            const uploadSessionPayload = {
              fileName: options.fileName,
              fileDescription: options.fileDescription,
              conflictBehavior: options.conflictBehavior
            };
            const session = yield _OneDriveLargeFileUploadTask.createUploadSession(client, requestUrl, uploadSessionPayload);
            const rangeSize = getValidRangeSize(options.rangeSize);
            return new _OneDriveLargeFileUploadTask(client, fileObject, session, {
              rangeSize,
              uploadEventHandlers: options.uploadEventHandlers
            });
          });
        }
        /**
         * @public
         * @static
         * @async
         * Makes request to the server to create an upload session
         * @param {Client} client - The GraphClient instance
         * @param {string} requestUrl - The URL to create the upload session
         * @param {string} payloadOptions - The payload option. Default conflictBehavior is 'rename'
         * @returns The promise that resolves to LargeFileUploadSession
         */
        static createUploadSession(client, requestUrl, payloadOptions) {
          const _super = Object.create(null, {
            createUploadSession: { get: () => super.createUploadSession }
          });
          return __awaiter9(this, void 0, void 0, function* () {
            const payload = {
              item: {
                "@microsoft.graph.conflictBehavior": (payloadOptions === null || payloadOptions === void 0 ? void 0 : payloadOptions.conflictBehavior) || "rename",
                name: payloadOptions === null || payloadOptions === void 0 ? void 0 : payloadOptions.fileName,
                description: payloadOptions === null || payloadOptions === void 0 ? void 0 : payloadOptions.fileDescription
              }
            };
            return _super.createUploadSession.call(this, client, requestUrl, payload);
          });
        }
        /**
         * @public
         * @constructor
         * Constructs a OneDriveLargeFileUploadTask
         * @param {Client} client - The GraphClient instance
         * @param {FileObject} file - The FileObject holding details of a file that needs to be uploaded
         * @param {LargeFileUploadSession} uploadSession - The upload session to which the upload has to be done
         * @param {LargeFileUploadTaskOptions} options - The upload task options
         * @returns An instance of OneDriveLargeFileUploadTask
         */
        constructor(client, file, uploadSession, options) {
          super(client, file, uploadSession, options);
        }
        /**
         * @public
         * Commits upload session to end uploading
         * @param {string} requestUrl - The URL to commit the upload session
         * @param {string} conflictBehavior - Conflict behaviour option. Default is 'rename'
         * @returns The promise resolves to committed response
         */
        commit(requestUrl, conflictBehavior = "rename") {
          return __awaiter9(this, void 0, void 0, function* () {
            const payload = {
              name: this.file.name,
              "@microsoft.graph.conflictBehavior": conflictBehavior,
              "@microsoft.graph.sourceUrl": this.uploadSession.url
            };
            return yield this.client.api(requestUrl).put(payload);
          });
        }
      };
      OneDriveLargeFileUploadTask.DEFAULT_UPLOAD_PATH = "/";
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/FileObjectClasses/StreamUpload.js
  var init_StreamUpload = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/FileUploadTask/FileObjectClasses/StreamUpload.js"() {
      init_GraphClientError();
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/PageIterator.js
  var init_PageIterator = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/tasks/PageIterator.js"() {
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/CustomAuthenticationProvider.js
  var CustomAuthenticationProvider;
  var init_CustomAuthenticationProvider = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/CustomAuthenticationProvider.js"() {
      init_tslib_es6();
      init_GraphClientError();
      CustomAuthenticationProvider = class {
        /**
         * @public
         * @constructor
         * Creates an instance of CustomAuthenticationProvider
         * @param {AuthProviderCallback} provider - An authProvider function
         * @returns An instance of CustomAuthenticationProvider
         */
        constructor(provider) {
          this.provider = provider;
        }
        /**
         * @public
         * @async
         * To get the access token
         * @returns The promise that resolves to an access token
         */
        getAccessToken() {
          return __awaiter9(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
              this.provider((error, accessToken) => __awaiter9(this, void 0, void 0, function* () {
                if (accessToken) {
                  resolve(accessToken);
                } else {
                  if (!error) {
                    const invalidTokenMessage = "Access token is undefined or empty.						Please provide a valid token.						For more help - https://github.com/microsoftgraph/msgraph-sdk-javascript/blob/dev/docs/CustomAuthenticationProvider.md";
                    error = new GraphClientError(invalidTokenMessage);
                  }
                  const err = yield GraphClientError.setGraphClientError(error);
                  reject(err);
                }
              }));
            });
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphError.js
  var GraphError;
  var init_GraphError = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphError.js"() {
      GraphError = class _GraphError extends Error {
        /**
         * @public
         * @constructor
         * Creates an instance of GraphError
         * @param {number} [statusCode = -1] - The status code of the error
         * @param {string} [message] - The message of the error
         * @param {Error} [baseError] - The base error
         * @returns An instance of GraphError
         */
        constructor(statusCode = -1, message, baseError) {
          super(message || baseError && baseError.message);
          Object.setPrototypeOf(this, _GraphError.prototype);
          this.statusCode = statusCode;
          this.code = null;
          this.requestId = null;
          this.date = /* @__PURE__ */ new Date();
          this.body = null;
          this.stack = baseError ? baseError.stack : this.stack;
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphErrorHandler.js
  var GraphErrorHandler;
  var init_GraphErrorHandler = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphErrorHandler.js"() {
      init_tslib_es6();
      init_GraphError();
      GraphErrorHandler = class _GraphErrorHandler {
        /**
         * @private
         * @static
         * Populates the GraphError instance with Error instance values
         * @param {Error} error - The error returned by graph service or some native error
         * @param {number} [statusCode] - The status code of the response
         * @returns The GraphError instance
         */
        static constructError(error, statusCode, rawResponse) {
          const gError = new GraphError(statusCode, "", error);
          if (error.name !== void 0) {
            gError.code = error.name;
          }
          gError.body = error.toString();
          gError.date = /* @__PURE__ */ new Date();
          gError.headers = rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.headers;
          return gError;
        }
        /**
         * @private
         * @static
         * @async
         * Populates the GraphError instance from the Error returned by graph service
         * @param {GraphAPIErrorResponse} graphError - The error possibly returned by graph service or some native error
         * @param {number} statusCode - The status code of the response
         * @returns A promise that resolves to GraphError instance
         *
         * Example error for https://graph.microsoft.com/v1.0/me/events?$top=3&$search=foo
         * {
         *      "error": {
         *          "code": "SearchEvents",
         *          "message": "The parameter $search is not currently supported on the Events resource.",
         *          "innerError": {
         *              "request-id": "b31c83fd-944c-4663-aa50-5d9ceb367e19",
         *              "date": "2016-11-17T18:37:45"
         *          }
         *      }
         *  }
         */
        static constructErrorFromResponse(graphError, statusCode, rawResponse) {
          const error = graphError.error;
          const gError = new GraphError(statusCode, error.message);
          gError.code = error.code;
          if (error.innerError !== void 0) {
            gError.requestId = error.innerError["request-id"];
            gError.date = new Date(error.innerError.date);
          }
          gError.body = JSON.stringify(error);
          gError.headers = rawResponse === null || rawResponse === void 0 ? void 0 : rawResponse.headers;
          return gError;
        }
        /**
         * @public
         * @static
         * @async
         * To get the GraphError object
         * Reference - https://docs.microsoft.com/en-us/graph/errors
         * @param {any} [error = null] - The error returned by graph service or some native error
         * @param {number} [statusCode = -1] - The status code of the response
         * @param {GraphRequestCallback} [callback] - The graph request callback function
         * @returns A promise that resolves to GraphError instance
         */
        static getError(error = null, statusCode = -1, callback, rawResponse) {
          return __awaiter9(this, void 0, void 0, function* () {
            let gError;
            if (error && error.error) {
              gError = _GraphErrorHandler.constructErrorFromResponse(error, statusCode, rawResponse);
            } else if (error instanceof Error) {
              gError = _GraphErrorHandler.constructError(error, statusCode, rawResponse);
            } else {
              gError = new GraphError(statusCode);
              gError.body = error;
            }
            if (typeof callback === "function") {
              callback(gError, null);
            } else {
              return gError;
            }
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphRequest.js
  var GraphRequest;
  var init_GraphRequest = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/GraphRequest.js"() {
      init_tslib_es6();
      init_GraphClientError();
      init_GraphErrorHandler();
      init_GraphRequestUtil();
      init_GraphResponseHandler();
      init_MiddlewareControl();
      init_RequestMethod();
      init_ResponseType();
      GraphRequest = class {
        /**
         * @public
         * @constructor
         * Creates an instance of GraphRequest
         * @param {HTTPClient} httpClient - The HTTPClient instance
         * @param {ClientOptions} config - The options for making request
         * @param {string} path - A path string
         */
        constructor(httpClient, config, path) {
          this.parsePath = (path2) => {
            if (path2.indexOf("https://") !== -1) {
              path2 = path2.replace("https://", "");
              const endOfHostStrPos = path2.indexOf("/");
              if (endOfHostStrPos !== -1) {
                this.urlComponents.host = "https://" + path2.substring(0, endOfHostStrPos);
                path2 = path2.substring(endOfHostStrPos + 1, path2.length);
              }
              const endOfVersionStrPos = path2.indexOf("/");
              if (endOfVersionStrPos !== -1) {
                this.urlComponents.version = path2.substring(0, endOfVersionStrPos);
                path2 = path2.substring(endOfVersionStrPos + 1, path2.length);
              }
            }
            if (path2.charAt(0) === "/") {
              path2 = path2.substr(1);
            }
            const queryStrPos = path2.indexOf("?");
            if (queryStrPos === -1) {
              this.urlComponents.path = path2;
            } else {
              this.urlComponents.path = path2.substr(0, queryStrPos);
              const queryParams = path2.substring(queryStrPos + 1, path2.length).split("&");
              for (const queryParam of queryParams) {
                this.parseQueryParameter(queryParam);
              }
            }
          };
          this.httpClient = httpClient;
          this.config = config;
          this.urlComponents = {
            host: this.config.baseUrl,
            version: this.config.defaultVersion,
            oDataQueryParams: {},
            otherURLQueryParams: {},
            otherURLQueryOptions: []
          };
          this._headers = {};
          this._options = {};
          this._middlewareOptions = [];
          this.parsePath(path);
        }
        /**
         * @private
         * Adds the query parameter as comma separated values
         * @param {string} propertyName - The name of a property
         * @param {string|string[]} propertyValue - The vale of a property
         * @param {IArguments} additionalProperties - The additional properties
         * @returns Nothing
         */
        addCsvQueryParameter(propertyName, propertyValue, additionalProperties) {
          this.urlComponents.oDataQueryParams[propertyName] = this.urlComponents.oDataQueryParams[propertyName] ? this.urlComponents.oDataQueryParams[propertyName] + "," : "";
          let allValues = [];
          if (additionalProperties.length > 1 && typeof propertyValue === "string") {
            allValues = Array.prototype.slice.call(additionalProperties);
          } else if (typeof propertyValue === "string") {
            allValues.push(propertyValue);
          } else {
            allValues = allValues.concat(propertyValue);
          }
          this.urlComponents.oDataQueryParams[propertyName] += allValues.join(",");
        }
        /**
         * @private
         * Builds the full url from the URLComponents to make a request
         * @returns The URL string that is qualified to make a request to graph endpoint
         */
        buildFullUrl() {
          const url = urlJoin([this.urlComponents.host, this.urlComponents.version, this.urlComponents.path]) + this.createQueryString();
          if (this.config.debugLogging) {
            console.log(url);
          }
          return url;
        }
        /**
         * @private
         * Builds the query string from the URLComponents
         * @returns The Constructed query string
         */
        createQueryString() {
          const urlComponents = this.urlComponents;
          const query = [];
          if (Object.keys(urlComponents.oDataQueryParams).length !== 0) {
            for (const property in urlComponents.oDataQueryParams) {
              if (Object.prototype.hasOwnProperty.call(urlComponents.oDataQueryParams, property)) {
                query.push(property + "=" + urlComponents.oDataQueryParams[property]);
              }
            }
          }
          if (Object.keys(urlComponents.otherURLQueryParams).length !== 0) {
            for (const property in urlComponents.otherURLQueryParams) {
              if (Object.prototype.hasOwnProperty.call(urlComponents.otherURLQueryParams, property)) {
                query.push(property + "=" + urlComponents.otherURLQueryParams[property]);
              }
            }
          }
          if (urlComponents.otherURLQueryOptions.length !== 0) {
            for (const str of urlComponents.otherURLQueryOptions) {
              query.push(str);
            }
          }
          return query.length > 0 ? "?" + query.join("&") : "";
        }
        /**
         * @private
         * Parses the query parameters to set the urlComponents property of the GraphRequest object
         * @param {string|KeyValuePairObjectStringNumber} queryDictionaryOrString - The query parameter
         * @returns The same GraphRequest instance that is being called with
         */
        parseQueryParameter(queryDictionaryOrString) {
          if (typeof queryDictionaryOrString === "string") {
            if (queryDictionaryOrString.charAt(0) === "?") {
              queryDictionaryOrString = queryDictionaryOrString.substring(1);
            }
            if (queryDictionaryOrString.indexOf("&") !== -1) {
              const queryParams = queryDictionaryOrString.split("&");
              for (const str of queryParams) {
                this.parseQueryParamenterString(str);
              }
            } else {
              this.parseQueryParamenterString(queryDictionaryOrString);
            }
          } else if (queryDictionaryOrString.constructor === Object) {
            for (const key in queryDictionaryOrString) {
              if (Object.prototype.hasOwnProperty.call(queryDictionaryOrString, key)) {
                this.setURLComponentsQueryParamater(key, queryDictionaryOrString[key]);
              }
            }
          }
          return this;
        }
        /**
         * @private
         * Parses the query parameter of string type to set the urlComponents property of the GraphRequest object
         * @param {string} queryParameter - the query parameters
         * returns nothing
         */
        parseQueryParamenterString(queryParameter) {
          if (this.isValidQueryKeyValuePair(queryParameter)) {
            const indexOfFirstEquals = queryParameter.indexOf("=");
            const paramKey = queryParameter.substring(0, indexOfFirstEquals);
            const paramValue = queryParameter.substring(indexOfFirstEquals + 1);
            this.setURLComponentsQueryParamater(paramKey, paramValue);
          } else {
            this.urlComponents.otherURLQueryOptions.push(queryParameter);
          }
        }
        /**
         * @private
         * Sets values into the urlComponents property of GraphRequest object.
         * @param {string} paramKey - the query parameter key
         * @param {string} paramValue - the query paramter value
         * @returns nothing
         */
        setURLComponentsQueryParamater(paramKey, paramValue) {
          if (oDataQueryNames.indexOf(paramKey) !== -1) {
            const currentValue = this.urlComponents.oDataQueryParams[paramKey];
            const isValueAppendable = currentValue && (paramKey === "$expand" || paramKey === "$select" || paramKey === "$orderby");
            this.urlComponents.oDataQueryParams[paramKey] = isValueAppendable ? currentValue + "," + paramValue : paramValue;
          } else {
            this.urlComponents.otherURLQueryParams[paramKey] = paramValue;
          }
        }
        /**
         * @private
         * Check if the query parameter string has a valid key-value structure
         * @param {string} queryString - the query parameter string. Example -> "name=value"
         * #returns true if the query string has a valid key-value structure else false
         */
        isValidQueryKeyValuePair(queryString) {
          const indexofFirstEquals = queryString.indexOf("=");
          if (indexofFirstEquals === -1) {
            return false;
          }
          const indexofOpeningParanthesis = queryString.indexOf("(");
          if (indexofOpeningParanthesis !== -1 && queryString.indexOf("(") < indexofFirstEquals) {
            return false;
          }
          return true;
        }
        /**
         * @private
         * Updates the custom headers and options for a request
         * @param {FetchOptions} options - The request options object
         * @returns Nothing
         */
        updateRequestOptions(options) {
          const optionsHeaders = Object.assign({}, options.headers);
          if (this.config.fetchOptions !== void 0) {
            const fetchOptions = Object.assign({}, this.config.fetchOptions);
            Object.assign(options, fetchOptions);
            if (typeof this.config.fetchOptions.headers !== void 0) {
              options.headers = Object.assign({}, this.config.fetchOptions.headers);
            }
          }
          Object.assign(options, this._options);
          if (options.headers !== void 0) {
            Object.assign(optionsHeaders, options.headers);
          }
          Object.assign(optionsHeaders, this._headers);
          options.headers = optionsHeaders;
        }
        /**
         * @private
         * @async
         * Adds the custom headers and options to the request and makes the HTTPClient send request call
         * @param {RequestInfo} request - The request url string or the Request object value
         * @param {FetchOptions} options - The options to make a request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the response content
         */
        send(request, options, callback) {
          var _a;
          return __awaiter9(this, void 0, void 0, function* () {
            let rawResponse;
            const middlewareControl = new MiddlewareControl(this._middlewareOptions);
            this.updateRequestOptions(options);
            const customHosts = (_a = this.config) === null || _a === void 0 ? void 0 : _a.customHosts;
            try {
              const context = yield this.httpClient.sendRequest({
                request,
                options,
                middlewareControl,
                customHosts
              });
              rawResponse = context.response;
              const response = yield GraphResponseHandler.getResponse(rawResponse, this._responseType, callback);
              return response;
            } catch (error) {
              if (error instanceof GraphClientError) {
                throw error;
              }
              let statusCode;
              if (rawResponse) {
                statusCode = rawResponse.status;
              }
              const gError = yield GraphErrorHandler.getError(error, statusCode, callback, rawResponse);
              throw gError;
            }
          });
        }
        /**
         * @private
         * Checks if the content-type is present in the _headers property. If not present, defaults the content-type to application/json
         * @param none
         * @returns nothing
         */
        setHeaderContentType() {
          if (!this._headers) {
            this.header("Content-Type", "application/json");
            return;
          }
          const headerKeys = Object.keys(this._headers);
          for (const headerKey of headerKeys) {
            if (headerKey.toLowerCase() === "content-type") {
              return;
            }
          }
          this.header("Content-Type", "application/json");
        }
        /**
         * @public
         * Sets the custom header for a request
         * @param {string} headerKey - A header key
         * @param {string} headerValue - A header value
         * @returns The same GraphRequest instance that is being called with
         */
        header(headerKey, headerValue) {
          this._headers[headerKey] = headerValue;
          return this;
        }
        /**
         * @public
         * Sets the custom headers for a request
         * @param {KeyValuePairObjectStringNumber | HeadersInit} headers - The request headers
         * @returns The same GraphRequest instance that is being called with
         */
        headers(headers) {
          for (const key in headers) {
            if (Object.prototype.hasOwnProperty.call(headers, key)) {
              this._headers[key] = headers[key];
            }
          }
          return this;
        }
        /**
         * @public
         * Sets the option for making a request
         * @param {string} key - The key value
         * @param {any} value - The value
         * @returns The same GraphRequest instance that is being called with
         */
        option(key, value) {
          this._options[key] = value;
          return this;
        }
        /**
         * @public
         * Sets the options for making a request
         * @param {{ [key: string]: any }} options - The options key value pair
         * @returns The same GraphRequest instance that is being called with
         */
        options(options) {
          for (const key in options) {
            if (Object.prototype.hasOwnProperty.call(options, key)) {
              this._options[key] = options[key];
            }
          }
          return this;
        }
        /**
         * @public
         * Sets the middleware options for a request
         * @param {MiddlewareOptions[]} options - The array of middleware options
         * @returns The same GraphRequest instance that is being called with
         */
        middlewareOptions(options) {
          this._middlewareOptions = options;
          return this;
        }
        /**
         * @public
         * Sets the api endpoint version for a request
         * @param {string} version - The version value
         * @returns The same GraphRequest instance that is being called with
         */
        version(version5) {
          this.urlComponents.version = version5;
          return this;
        }
        /**
         * @public
         * Sets the api endpoint version for a request
         * @param {ResponseType} responseType - The response type value
         * @returns The same GraphRequest instance that is being called with
         */
        responseType(responseType) {
          this._responseType = responseType;
          return this;
        }
        /**
         * @public
         * To add properties for select OData Query param
         * @param {string|string[]} properties - The Properties value
         * @returns The same GraphRequest instance that is being called with, after adding the properties for $select query
         */
        /*
         * Accepts .select("displayName,birthday")
         *     and .select(["displayName", "birthday"])
         *     and .select("displayName", "birthday")
         *
         */
        select(properties) {
          this.addCsvQueryParameter("$select", properties, arguments);
          return this;
        }
        /**
         * @public
         * To add properties for expand OData Query param
         * @param {string|string[]} properties - The Properties value
         * @returns The same GraphRequest instance that is being called with, after adding the properties for $expand query
         */
        expand(properties) {
          this.addCsvQueryParameter("$expand", properties, arguments);
          return this;
        }
        /**
         * @public
         * To add properties for orderby OData Query param
         * @param {string|string[]} properties - The Properties value
         * @returns The same GraphRequest instance that is being called with, after adding the properties for $orderby query
         */
        orderby(properties) {
          this.addCsvQueryParameter("$orderby", properties, arguments);
          return this;
        }
        /**
         * @public
         * To add query string for filter OData Query param. The request URL accepts only one $filter Odata Query option and its value is set to the most recently passed filter query string.
         * @param {string} filterStr - The filter query string
         * @returns The same GraphRequest instance that is being called with, after adding the $filter query
         */
        filter(filterStr) {
          this.urlComponents.oDataQueryParams.$filter = filterStr;
          return this;
        }
        /**
         * @public
         * To add criterion for search OData Query param. The request URL accepts only one $search Odata Query option and its value is set to the most recently passed search criterion string.
         * @param {string} searchStr - The search criterion string
         * @returns The same GraphRequest instance that is being called with, after adding the $search query criteria
         */
        search(searchStr) {
          this.urlComponents.oDataQueryParams.$search = searchStr;
          return this;
        }
        /**
         * @public
         * To add number for top OData Query param. The request URL accepts only one $top Odata Query option and its value is set to the most recently passed number value.
         * @param {number} n - The number value
         * @returns The same GraphRequest instance that is being called with, after adding the number for $top query
         */
        top(n) {
          this.urlComponents.oDataQueryParams.$top = n;
          return this;
        }
        /**
         * @public
         * To add number for skip OData Query param. The request URL accepts only one $skip Odata Query option and its value is set to the most recently passed number value.
         * @param {number} n - The number value
         * @returns The same GraphRequest instance that is being called with, after adding the number for the $skip query
         */
        skip(n) {
          this.urlComponents.oDataQueryParams.$skip = n;
          return this;
        }
        /**
         * @public
         * To add token string for skipToken OData Query param. The request URL accepts only one $skipToken Odata Query option and its value is set to the most recently passed token value.
         * @param {string} token - The token value
         * @returns The same GraphRequest instance that is being called with, after adding the token string for $skipToken query option
         */
        skipToken(token) {
          this.urlComponents.oDataQueryParams.$skipToken = token;
          return this;
        }
        /**
         * @public
         * To add boolean for count OData Query param. The URL accepts only one $count Odata Query option and its value is set to the most recently passed boolean value.
         * @param {boolean} isCount - The count boolean
         * @returns The same GraphRequest instance that is being called with, after adding the boolean value for the $count query option
         */
        count(isCount = true) {
          this.urlComponents.oDataQueryParams.$count = isCount.toString();
          return this;
        }
        /**
         * @public
         * Appends query string to the urlComponent
         * @param {string|KeyValuePairObjectStringNumber} queryDictionaryOrString - The query value
         * @returns The same GraphRequest instance that is being called with, after appending the query string to the url component
         */
        /*
         * Accepts .query("displayName=xyz")
         *     and .select({ name: "value" })
         */
        query(queryDictionaryOrString) {
          return this.parseQueryParameter(queryDictionaryOrString);
        }
        /**
         * @public
         * @async
         * Makes a http request with GET method
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the get response
         */
        get(callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            const options = {
              method: RequestMethod.GET
            };
            const response = yield this.send(url, options, callback);
            return response;
          });
        }
        /**
         * @public
         * @async
         * Makes a http request with POST method
         * @param {any} content - The content that needs to be sent with the request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the post response
         */
        post(content, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            const options = {
              method: RequestMethod.POST,
              body: serializeContent(content)
            };
            const className = content && content.constructor && content.constructor.name;
            if (className === "FormData") {
              options.headers = {};
            } else {
              this.setHeaderContentType();
              options.headers = this._headers;
            }
            return yield this.send(url, options, callback);
          });
        }
        /**
         * @public
         * @async
         * Alias for Post request call
         * @param {any} content - The content that needs to be sent with the request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the post response
         */
        create(content, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            return yield this.post(content, callback);
          });
        }
        /**
         * @public
         * @async
         * Makes http request with PUT method
         * @param {any} content - The content that needs to be sent with the request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the put response
         */
        put(content, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            this.setHeaderContentType();
            const options = {
              method: RequestMethod.PUT,
              body: serializeContent(content)
            };
            return yield this.send(url, options, callback);
          });
        }
        /**
         * @public
         * @async
         * Makes http request with PATCH method
         * @param {any} content - The content that needs to be sent with the request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the patch response
         */
        patch(content, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            this.setHeaderContentType();
            const options = {
              method: RequestMethod.PATCH,
              body: serializeContent(content)
            };
            return yield this.send(url, options, callback);
          });
        }
        /**
         * @public
         * @async
         * Alias for PATCH request
         * @param {any} content - The content that needs to be sent with the request
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the patch response
         */
        update(content, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            return yield this.patch(content, callback);
          });
        }
        /**
         * @public
         * @async
         * Makes http request with DELETE method
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the delete response
         */
        delete(callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            const options = {
              method: RequestMethod.DELETE
            };
            return yield this.send(url, options, callback);
          });
        }
        /**
         * @public
         * @async
         * Alias for delete request call
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the delete response
         */
        del(callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            return yield this.delete(callback);
          });
        }
        /**
         * @public
         * @async
         * Makes a http request with GET method to read response as a stream.
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the getStream response
         */
        getStream(callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            const options = {
              method: RequestMethod.GET
            };
            this.responseType(ResponseType.STREAM);
            return yield this.send(url, options, callback);
          });
        }
        /**
         * @public
         * @async
         * Makes a http request with GET method to read response as a stream.
         * @param {any} stream - The stream instance
         * @param {GraphRequestCallback} [callback] - The callback function to be called in response with async call
         * @returns A promise that resolves to the putStream response
         */
        putStream(stream, callback) {
          return __awaiter9(this, void 0, void 0, function* () {
            const url = this.buildFullUrl();
            const options = {
              method: RequestMethod.PUT,
              headers: {
                "Content-Type": "application/octet-stream"
              },
              body: stream
            };
            return yield this.send(url, options, callback);
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/HTTPClient.js
  var HTTPClient;
  var init_HTTPClient = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/HTTPClient.js"() {
      init_tslib_es6();
      HTTPClient = class {
        /**
         * @public
         * @constructor
         * Creates an instance of a HTTPClient
         * @param {...Middleware} middleware - The first middleware of the middleware chain or a sequence of all the Middleware handlers
         */
        constructor(...middleware) {
          if (!middleware || !middleware.length) {
            const error = new Error();
            error.name = "InvalidMiddlewareChain";
            error.message = "Please provide a default middleware chain or custom middleware chain";
            throw error;
          }
          this.setMiddleware(...middleware);
        }
        /**
         * @private
         * Processes the middleware parameter passed to set this.middleware property
         * The calling function should validate if middleware is not undefined or not empty.
         * @param {...Middleware} middleware - The middleware passed
         * @returns Nothing
         */
        setMiddleware(...middleware) {
          if (middleware.length > 1) {
            this.parseMiddleWareArray(middleware);
          } else {
            this.middleware = middleware[0];
          }
        }
        /**
         * @private
         * Processes the middleware array to construct the chain
         * and sets this.middleware property to the first middleware handler of the array
         * The calling function should validate if middleware is not undefined or not empty
         * @param {Middleware[]} middlewareArray - The array of middleware handlers
         * @returns Nothing
         */
        parseMiddleWareArray(middlewareArray) {
          middlewareArray.forEach((element, index2) => {
            if (index2 < middlewareArray.length - 1) {
              element.setNext(middlewareArray[index2 + 1]);
            }
          });
          this.middleware = middlewareArray[0];
        }
        /**
         * @public
         * @async
         * To send the request through the middleware chain
         * @param {Context} context - The context of a request
         * @returns A promise that resolves to the Context
         */
        sendRequest(context) {
          return __awaiter9(this, void 0, void 0, function* () {
            if (typeof context.request === "string" && context.options === void 0) {
              const error = new Error();
              error.name = "InvalidRequestOptions";
              error.message = "Unable to execute the middleware, Please provide valid options for a request";
              throw error;
            }
            yield this.middleware.execute(context);
            return context;
          });
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/HTTPClientFactory.js
  var isNodeEnvironment, HTTPClientFactory;
  var init_HTTPClientFactory = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/HTTPClientFactory.js"() {
      init_HTTPClient();
      init_AuthenticationHandler();
      init_HTTPMessageHandler();
      init_RedirectHandlerOptions();
      init_RetryHandlerOptions();
      init_RedirectHandler();
      init_RetryHandler();
      init_TelemetryHandler();
      isNodeEnvironment = () => {
        return typeof process === "object" && typeof __require === "function";
      };
      HTTPClientFactory = class _HTTPClientFactory {
        /**
         * @public
         * @static
         * Creates HTTPClient with default middleware chain
         * @param {AuthenticationProvider} authProvider - The authentication provider instance
         * @returns A HTTPClient instance
         *
         * NOTE: These are the things that we need to remember while doing modifications in the below default pipeline.
         * 		* HTTPMessageHandler should be the last one in the middleware pipeline, because this makes the actual network call of the request
         * 		* TelemetryHandler should be the one prior to the last middleware in the chain, because this is the one which actually collects and appends the usage flag and placing this handler 	*		  before making the actual network call ensures that the usage of all features are recorded in the flag.
         * 		* The best place for AuthenticationHandler is in the starting of the pipeline, because every other handler might have to work for multiple times for a request but the auth token for
         * 		  them will remain same. For example, Retry and Redirect handlers might be working multiple times for a request based on the response but their auth token would remain same.
         */
        static createWithAuthenticationProvider(authProvider) {
          const authenticationHandler = new AuthenticationHandler(authProvider);
          const retryHandler = new RetryHandler(new RetryHandlerOptions());
          const telemetryHandler = new TelemetryHandler();
          const httpMessageHandler = new HTTPMessageHandler();
          authenticationHandler.setNext(retryHandler);
          if (isNodeEnvironment()) {
            const redirectHandler = new RedirectHandler(new RedirectHandlerOptions());
            retryHandler.setNext(redirectHandler);
            redirectHandler.setNext(telemetryHandler);
          } else {
            retryHandler.setNext(telemetryHandler);
          }
          telemetryHandler.setNext(httpMessageHandler);
          return _HTTPClientFactory.createWithMiddleware(authenticationHandler);
        }
        /**
         * @public
         * @static
         * Creates a middleware chain with the given one
         * @property {...Middleware} middleware - The first middleware of the middleware chain or a sequence of all the Middleware handlers
         * @returns A HTTPClient instance
         */
        static createWithMiddleware(...middleware) {
          return new HTTPClient(...middleware);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/ValidatePolyFilling.js
  var validatePolyFilling;
  var init_ValidatePolyFilling = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/ValidatePolyFilling.js"() {
      validatePolyFilling = () => {
        if (typeof Promise === "undefined" && typeof fetch === "undefined") {
          const error = new Error("Library cannot function without Promise and fetch. So, please provide polyfill for them.");
          error.name = "PolyFillNotAvailable";
          throw error;
        } else if (typeof Promise === "undefined") {
          const error = new Error("Library cannot function without Promise. So, please provide polyfill for it.");
          error.name = "PolyFillNotAvailable";
          throw error;
        } else if (typeof fetch === "undefined") {
          const error = new Error("Library cannot function without fetch. So, please provide polyfill for it.");
          error.name = "PolyFillNotAvailable";
          throw error;
        }
        return true;
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Client.js
  var Client;
  var init_Client = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/Client.js"() {
      init_Constants();
      init_CustomAuthenticationProvider();
      init_GraphRequest();
      init_HTTPClient();
      init_HTTPClientFactory();
      init_ValidatePolyFilling();
      Client = class _Client {
        /**
         * @public
         * @static
         * To create a client instance with options and initializes the default middleware chain
         * @param {Options} options - The options for client instance
         * @returns The Client instance
         */
        static init(options) {
          const clientOptions = {};
          for (const i in options) {
            if (Object.prototype.hasOwnProperty.call(options, i)) {
              clientOptions[i] = i === "authProvider" ? new CustomAuthenticationProvider(options[i]) : options[i];
            }
          }
          return _Client.initWithMiddleware(clientOptions);
        }
        /**
         * @public
         * @static
         * To create a client instance with the Client Options
         * @param {ClientOptions} clientOptions - The options object for initializing the client
         * @returns The Client instance
         */
        static initWithMiddleware(clientOptions) {
          return new _Client(clientOptions);
        }
        /**
         * @private
         * @constructor
         * Creates an instance of Client
         * @param {ClientOptions} clientOptions - The options to instantiate the client object
         */
        constructor(clientOptions) {
          this.config = {
            baseUrl: GRAPH_BASE_URL,
            debugLogging: false,
            defaultVersion: GRAPH_API_VERSION
          };
          validatePolyFilling();
          for (const key in clientOptions) {
            if (Object.prototype.hasOwnProperty.call(clientOptions, key)) {
              this.config[key] = clientOptions[key];
            }
          }
          let httpClient;
          if (clientOptions.authProvider !== void 0 && clientOptions.middleware !== void 0) {
            const error = new Error();
            error.name = "AmbiguityInInitialization";
            error.message = "Unable to Create Client, Please provide either authentication provider for default middleware chain or custom middleware chain not both";
            throw error;
          } else if (clientOptions.authProvider !== void 0) {
            httpClient = HTTPClientFactory.createWithAuthenticationProvider(clientOptions.authProvider);
          } else if (clientOptions.middleware !== void 0) {
            httpClient = new HTTPClient(...[].concat(clientOptions.middleware));
          } else {
            const error = new Error();
            error.name = "InvalidMiddlewareChain";
            error.message = "Unable to Create Client, Please provide either authentication provider for default middleware chain or custom middleware chain";
            throw error;
          }
          this.httpClient = httpClient;
        }
        /**
         * @public
         * Entry point to make requests
         * @param {string} path - The path string value
         * @returns The graph request instance
         */
        api(path) {
          return new GraphRequest(this.httpClient, this.config, path);
        }
      };
    }
  });

  // project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/browser/index.js
  var init_browser2 = __esm({
    "project/node_modules/@microsoft/microsoft-graph-client/lib/es/src/browser/index.js"() {
      init_BatchRequestContent();
      init_BatchResponseContent();
      init_AuthenticationHandler();
      init_HTTPMessageHandler();
      init_RetryHandler();
      init_RedirectHandler();
      init_TelemetryHandler();
      init_MiddlewareFactory();
      init_AuthenticationHandlerOptions();
      init_RetryHandlerOptions();
      init_RedirectHandlerOptions();
      init_TelemetryHandlerOptions();
      init_ChaosHandlerOptions();
      init_ChaosStrategy();
      init_ChaosHandler();
      init_LargeFileUploadTask();
      init_OneDriveLargeFileUploadTask();
      init_OneDriveLargeFileUploadTaskUtil();
      init_StreamUpload();
      init_FileUpload();
      init_UploadResult();
      init_Range();
      init_PageIterator();
      init_Client();
      init_CustomAuthenticationProvider();
      init_GraphError();
      init_GraphClientError();
      init_GraphRequest();
      init_ResponseType();
    }
  });

  // project/netlify/functions/graphService.js
  var RateLimiter, rateLimiter, GraphService;
  var init_graphService = __esm({
    "project/netlify/functions/graphService.js"() {
      init_browser2();
      RateLimiter = class {
        constructor(maxRequestsPerMinute = 60, maxConcurrentRequests = 3) {
          this.maxRequestsPerMinute = maxRequestsPerMinute;
          this.maxConcurrentRequests = maxConcurrentRequests;
          this.requestQueue = [];
          this.activeRequests = 0;
          this.requestTimes = [];
        }
        async executeRequest(requestFn) {
          return new Promise((resolve, reject) => {
            this.requestQueue.push({ requestFn, resolve, reject });
            this.processQueue();
          });
        }
        async processQueue() {
          if (this.activeRequests >= this.maxConcurrentRequests || this.requestQueue.length === 0) {
            return;
          }
          const now = Date.now();
          const oneMinuteAgo = now - 6e4;
          this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo);
          if (this.requestTimes.length >= this.maxRequestsPerMinute) {
            const oldestRequest = this.requestTimes[0];
            const waitTime = 6e4 - (now - oldestRequest);
            setTimeout(() => this.processQueue(), waitTime);
            return;
          }
          const { requestFn, resolve, reject } = this.requestQueue.shift();
          this.activeRequests++;
          this.requestTimes.push(now);
          try {
            const result = await requestFn();
            resolve(result);
          } catch (error) {
            reject(error);
          } finally {
            this.activeRequests--;
            this.processQueue();
          }
        }
      };
      rateLimiter = new RateLimiter(60, 3);
      GraphService = class {
        constructor(accessToken) {
          const authProvider = {
            getAccessToken: async () => {
              return accessToken;
            }
          };
          this.graphClient = Client.initWithMiddleware({ authProvider });
        }
        async getUserProfile() {
          try {
            const user = await this.graphClient.api("/me").get();
            return user;
          } catch (error) {
            console.error("Error getting user profile:", error);
            throw error;
          }
        }
        async getMailFolders() {
          try {
            console.log("GraphService - Listando pastas de email...");
            const folders = await rateLimiter.executeRequest(async () => {
              return await this.graphClient.api("/me/mailFolders").get();
            });
            console.log("GraphService - Pastas encontradas:", folders);
            if (folders.value) {
              folders.value.forEach((folder) => {
                console.log(`- ${folder.displayName} (${folder.id}): ${folder.totalItemCount || 0} emails`);
              });
            }
            return folders;
          } catch (error) {
            console.error("Error getting mail folders:", error);
            throw error;
          }
        }
        async getEmails(top = 10, skip = 0) {
          try {
            console.log("GraphService - Analisando estrutura de emails...");
            await this.getMailFolders();
            console.log("GraphService - Buscando todos os emails da pasta principal...");
            const allEmails = await rateLimiter.executeRequest(async () => {
              return await this.graphClient.api("/me/messages").top(top).skip(skip).select("id,subject,from,receivedDateTime,isRead,bodyPreview,body").orderby("receivedDateTime desc").get();
            });
            console.log("GraphService - Total de emails na pasta principal:", allEmails.value?.length || 0);
            const unreadEmails = allEmails.value?.filter((email) => !email.isRead) || [];
            console.log("GraphService - Emails n\xE3o lidos ap\xF3s filtro:", unreadEmails.length);
            if (unreadEmails.length === 0) {
              console.log("GraphService - Nenhum email n\xE3o lido encontrado, retornando array vazio");
              return { value: [] };
            }
            return {
              ...allEmails,
              value: unreadEmails
            };
          } catch (error) {
            console.error("Error getting emails:", error);
            throw error;
          }
        }
        async markEmailAsRead(emailId) {
          try {
            await rateLimiter.executeRequest(async () => {
              return await this.graphClient.api(`/me/messages/${emailId}`).patch({ isRead: true });
            });
            return true;
          } catch (error) {
            console.error("Error marking email as read:", error);
            throw error;
          }
        }
        async sendReply(emailId, replyMessage) {
          try {
            await rateLimiter.executeRequest(async () => {
              return await this.graphClient.api(`/me/messages/${emailId}/reply`).post(replyMessage);
            });
            return true;
          } catch (error) {
            console.error("Error sending reply:", error);
            throw error;
          }
        }
        async sendEmail(emailMessage) {
          try {
            await rateLimiter.executeRequest(async () => {
              return await this.graphClient.api("/me/sendMail").post(emailMessage);
            });
            return true;
          } catch (error) {
            console.error("Error sending email:", error);
            throw error;
          }
        }
      };
    }
  });

  // project/netlify/functions/aiService.js
  var AIService, GeminiService, MockAIService;
  var init_aiService = __esm({
    "project/netlify/functions/aiService.js"() {
      AIService = class {
        constructor(provider = "mock", apiKey) {
          if (provider === "gemini" && apiKey) {
            this.provider = new GeminiService(apiKey);
          } else {
            this.provider = new MockAIService();
          }
        }
        async processEmail(email, userId = null) {
          console.log(`AIService - Processando email: ${email.subject}`);
          try {
            const edgeFunctionResult = await this.processWithEdgeFunction(email, userId);
            if (edgeFunctionResult) {
              console.log(`AIService - Usando Edge Function com base de conhecimento`);
              return edgeFunctionResult;
            }
          } catch (error) {
            console.log(`AIService - Edge Function falhou, usando fallback local:`, error.message);
          }
          const analysis = await this.provider.analyzeEmail(email);
          console.log(`AIService - An\xE1lise:`, analysis);
          if (!analysis.shouldReply) {
            console.log("AIService - Email n\xE3o deve ser respondido");
            return { analysis };
          }
          const response = await this.provider.generateResponse(email, analysis);
          console.log(`AIService - Resposta gerada: ${response.substring(0, 100)}...`);
          return { analysis, response };
        }
        async processBatch(emails, userId = null) {
          console.log(`AIService - Processando lote de ${emails.length} emails`);
          try {
            const batchResults = await this.processBatchWithEdgeFunction(emails, userId);
            if (batchResults && batchResults.length > 0) {
              console.log(`AIService - Lote processado com Edge Function`);
              return batchResults;
            }
          } catch (error) {
            console.log(`AIService - Edge Function de lote falhou, usando fallback individual:`, error.message);
          }
          const results = [];
          for (const email of emails) {
            try {
              const result = await this.processEmail(email, userId);
              results.push(result);
            } catch (error) {
              console.error(`AIService - Erro ao processar email individual ${email.id}:`, error);
              results.push({
                analysis: { shouldReply: false, priority: "low", category: "general", confidence: 0 },
                response: null
              });
            }
          }
          return results;
        }
        async processWithEdgeFunction(email, userId) {
          try {
            console.log("AIService - Chamando Edge Function com base de conhecimento...");
            const response = await fetch(`${process.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-email-polling`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                email: {
                  id: email.id,
                  subject: email.subject,
                  from: email.from?.emailAddress?.address,
                  bodyPreview: email.bodyPreview,
                  body: email.body?.content || email.bodyPreview
                },
                user_id: userId
              })
            });
            if (!response.ok) {
              throw new Error(`Edge Function error: ${response.status}`);
            }
            const data = await response.json();
            if (data.result && data.result.analysis) {
              return {
                analysis: data.result.analysis,
                response: data.result.response
              };
            }
            return null;
          } catch (error) {
            console.error("AIService - Erro ao chamar Edge Function:", error);
            throw error;
          }
        }
        async processBatchWithEdgeFunction(emails, userId) {
          try {
            console.log(`AIService - Chamando Edge Function para lote de ${emails.length} emails...`);
            const emailData = emails.map((email) => ({
              id: email.id,
              subject: email.subject,
              from: email.from?.emailAddress?.address,
              bodyPreview: email.bodyPreview,
              body: email.body?.content || email.bodyPreview
            }));
            const response = await fetch(`${process.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-email-polling`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                action: "process_batch",
                emails: emailData,
                user_id: userId
              })
            });
            if (!response.ok) {
              throw new Error(`Edge Function batch error: ${response.status}`);
            }
            const data = await response.json();
            if (data.results && Array.isArray(data.results)) {
              return data.results.map((result) => ({
                analysis: result.analysis,
                response: result.response
              }));
            }
            return null;
          } catch (error) {
            console.error("AIService - Erro ao chamar Edge Function para lote:", error);
            throw error;
          }
        }
        getProviderName() {
          return this.provider.name;
        }
      };
      GeminiService = class {
        constructor(apiKey, model = "gemini-2.0-flash-exp") {
          this.name = "Google Gemini";
          this.apiKey = apiKey;
          this.model = model;
        }
        async analyzeEmail(email) {
          const prompt = `
Analise o seguinte email e determine se deve ser respondido automaticamente:

Assunto: ${email.subject || "Sem assunto"}
De: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Desconhecido"}
Conte\xFAdo: ${email.bodyPreview || "Sem conte\xFAdo"}

Responda APENAS em JSON v\xE1lido com a seguinte estrutura:
{
  "shouldReply": boolean,
  "priority": "low" | "medium" | "high",
  "category": "question" | "complaint" | "support" | "spam" | "general",
  "suggestedResponse": "Resposta sugerida em portugu\xEAs",
  "confidence": number (0-1)
}

Regras:
- Responda apenas se for uma pergunta, solicita\xE7\xE3o de suporte ou reclama\xE7\xE3o
- N\xE3o responda se for spam, promo\xE7\xE3o ou email interno
- Use tom profissional e \xFAtil
- Seja conciso mas completo
- Inclua informa\xE7\xF5es relevantes quando apropriado
- Responda APENAS o JSON, sem texto adicional
`;
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 500,
                  topP: 0.8,
                  topK: 10
                }
              })
            });
            const data = await response.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!content) {
              throw new Error("Resposta vazia do Gemini");
            }
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
              throw new Error("Resposta n\xE3o cont\xE9m JSON v\xE1lido");
            }
            return JSON.parse(jsonMatch[0]);
          } catch (error) {
            console.error("Erro ao analisar email com Gemini:", error);
            return {
              shouldReply: false,
              priority: "low",
              category: "general",
              suggestedResponse: "",
              confidence: 0
            };
          }
        }
        async generateResponse(email, analysis) {
          const prompt = `
Gere uma resposta profissional para o seguinte email:

Assunto: ${email.subject || "Sem assunto"}
De: ${email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Desconhecido"}
Conte\xFAdo: ${email.bodyPreview || "Sem conte\xFAdo"}

An\xE1lise:
- Categoria: ${analysis.category}
- Prioridade: ${analysis.priority}
- Resposta sugerida: ${analysis.suggestedResponse}

Gere uma resposta final em portugu\xEAs brasileiro que seja:
- Profissional e cort\xEAs
- \xDAtil e informativa
- Concisa mas completa
- Adequada ao contexto
- Inclua assinatura autom\xE1tica se apropriado

Responda APENAS o texto da resposta, sem formata\xE7\xE3o adicional.
`;
          try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                contents: [{
                  parts: [{
                    text: prompt
                  }]
                }],
                generationConfig: {
                  temperature: 0.7,
                  maxOutputTokens: 300,
                  topP: 0.8,
                  topK: 10
                }
              })
            });
            const data = await response.json();
            return data.candidates?.[0]?.content?.parts?.[0]?.text || analysis.suggestedResponse;
          } catch (error) {
            console.error("Erro ao gerar resposta com Gemini:", error);
            return analysis.suggestedResponse;
          }
        }
      };
      MockAIService = class {
        constructor() {
          this.name = "Mock AI";
        }
        async analyzeEmail(email) {
          const subject = (email.subject || "").toLowerCase();
          const content = (email.bodyPreview || "").toLowerCase();
          const keywords = {
            question: ["pergunta", "d\xFAvida", "como", "quando", "onde", "por que"],
            complaint: ["reclama\xE7\xE3o", "problema", "erro", "n\xE3o funciona", "bug"],
            support: ["suporte", "ajuda", "assist\xEAncia", "t\xE9cnico"],
            spam: ["promo\xE7\xE3o", "oferta", "desconto", "marketing", "newsletter"]
          };
          let category = "general";
          let shouldReply = true;
          let priority = "medium";
          for (const [cat, words] of Object.entries(keywords)) {
            if (words.some((word) => subject.includes(word) || content.includes(word))) {
              category = cat;
              break;
            }
          }
          if (category === "spam") {
            shouldReply = false;
            priority = "low";
          }
          if (category === "complaint") {
            priority = "high";
          } else if (category === "question") {
            priority = "medium";
          }
          return {
            shouldReply,
            priority,
            category,
            suggestedResponse: `Obrigado pelo seu email. Recebemos sua ${category === "question" ? "pergunta" : category === "complaint" ? "reclama\xE7\xE3o" : "mensagem"} e entraremos em contato em breve.`,
            confidence: 0.8
          };
        }
        async generateResponse(email, analysis) {
          const responses = {
            question: `Ol\xE1!

Obrigado pela sua pergunta. Vou analisar sua solicita\xE7\xE3o e retornar com uma resposta detalhada em breve.

Atenciosamente,
Assistente Autom\xE1tico`,
            complaint: `Ol\xE1!

Recebemos sua reclama\xE7\xE3o e lamentamos pelo inconveniente. Nossa equipe est\xE1 analisando o caso e entraremos em contato para resolver a situa\xE7\xE3o.

Atenciosamente,
Equipe de Suporte`,
            support: `Ol\xE1!

Obrigado por entrar em contato conosco. Nossa equipe de suporte t\xE9cnico est\xE1 analisando sua solicita\xE7\xE3o e retornar\xE1 em breve.

Atenciosamente,
Equipe de Suporte T\xE9cnico`,
            general: `Ol\xE1!

Obrigado pelo seu email. Recebemos sua mensagem e entraremos em contato em breve.

Atenciosamente,
Equipe de Atendimento`
          };
          return responses[analysis.category] || responses.general;
        }
      };
    }
  });

  // project/netlify/functions/emailProcessor.js
  var emailProcessor_exports = {};
  __export(emailProcessor_exports, {
    EmailProcessor: () => EmailProcessor,
    default: () => emailProcessor_default
  });
  var EmailProcessor, emailProcessor_default;
  var init_emailProcessor = __esm({
    "project/netlify/functions/emailProcessor.js"() {
      init_graphService();
      init_aiService();
      EmailProcessor = class {
        constructor(accessToken, aiApiKey, userId = null, userEmail = null) {
          this.graphService = new GraphService(accessToken);
          this.aiService = new AIService(aiApiKey ? "gemini" : "mock", aiApiKey);
          this.processedEmails = /* @__PURE__ */ new Map();
          this.userId = userId;
          this.userEmail = userEmail;
          console.log("\u{1F50D} EmailProcessor - Constructor - userId recebido:", userId);
          console.log("\u{1F50D} EmailProcessor - Constructor - userEmail recebido:", userEmail);
        }
        async processNewEmails() {
          console.log("EmailProcessor - Iniciando processamento de novos emails...");
          try {
            const emails = await this.graphService.getEmails(20);
            const newEmails = emails.value || [];
            console.log(`EmailProcessor - Encontrados ${newEmails.length} emails para processar`);
            if (newEmails.length === 0) {
              console.log("EmailProcessor - Nenhum email encontrado, retornando array vazio");
              return [];
            }
            const processedEmailsFromDB = await this.getProcessedEmailsFromDB();
            const processedMessageIds = new Set(processedEmailsFromDB.map((pe) => pe.microsoft_message_id));
            console.log(`EmailProcessor - Emails j\xE1 processados no banco: ${processedMessageIds.size}`);
            const unprocessedEmails = newEmails.filter((email) => !processedMessageIds.has(email.id));
            console.log(`EmailProcessor - Emails novos para processar: ${unprocessedEmails.length}`);
            const processedEmails = [];
            const systemEmails = [];
            const validEmails = [];
            for (const email of unprocessedEmails) {
              if (this.processedEmails.has(email.id)) {
                console.log(`EmailProcessor - Email ${email.id} j\xE1 foi processado na mem\xF3ria, pulando...`);
                continue;
              }
              if (this.isSystemEmail(email)) {
                console.log(`EmailProcessor - Email de sistema detectado, pulando: ${email.subject}`);
                systemEmails.push(email);
              } else {
                validEmails.push(email);
              }
            }
            for (const email of systemEmails) {
              this.processedEmails.set(email.id, {
                id: email.id,
                subject: email.subject || "Sem assunto",
                from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Desconhecido",
                analysis: { shouldReply: false, priority: "low", category: "system", confidence: 1 },
                processedAt: /* @__PURE__ */ new Date(),
                status: "processed"
              });
              await this.saveProcessedEmailToDB(email, {
                analysis: { shouldReply: false, priority: "low", category: "system", confidence: 1 },
                response: null
              }, "processed");
            }
            if (validEmails.length > 0) {
              console.log(`
\u{1F4E6} EmailProcessor - Processando ${validEmails.length} emails em lotes...`);
              const batchSize = 1;
              const batches = [];
              for (let i = 0; i < validEmails.length; i += batchSize) {
                batches.push(validEmails.slice(i, i + batchSize));
              }
              for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
                const batch = batches[batchIndex];
                console.log(`
\u{1F4E6} EmailProcessor - Processando lote ${batchIndex + 1}/${batches.length} (${batch.length} emails)`);
                try {
                  const batchResults = await this.aiService.processBatch(batch, this.userId);
                  for (let i = 0; i < batch.length; i++) {
                    const email = batch[i];
                    const result = batchResults[i] || { analysis: { shouldReply: false }, response: null };
                    console.log(`
\u{1F4E7} PROCESSANDO EMAIL ${i + 1}/${batch.length}:`);
                    console.log(`   \u{1F4DD} Assunto: ${email.subject}`);
                    console.log(`   \u{1F4E7} ID: ${email.id}`);
                    console.log(`   \u{1F464} De: ${email.from?.emailAddress?.address}`);
                    console.log(`   \u{1F4C4} Body Preview: ${email.bodyPreview}`);
                    console.log(`   \u{1F4C4} Body Content: ${email.body?.content || "N/A"}`);
                    console.log(`   \u{1F4C4} Body Type: ${email.body?.contentType || "N/A"}`);
                    const processedEmail = {
                      id: email.id,
                      subject: email.subject || "Sem assunto",
                      from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Desconhecido",
                      analysis: result.analysis,
                      response: result.response,
                      processedAt: /* @__PURE__ */ new Date(),
                      status: "processed"
                    };
                    this.processedEmails.set(email.id, processedEmail);
                    processedEmails.push(processedEmail);
                    await this.saveProcessedEmailToDB(email, result, "processed");
                    if (result.analysis.shouldReply && result.response) {
                      try {
                        await this.sendReply(email, result.response);
                        console.log(`EmailProcessor - Resposta enviada para: ${email.subject}`);
                        await this.saveProcessedEmailToDB(email, result, "replied");
                      } catch (replyError) {
                        console.error(`EmailProcessor - Erro ao enviar resposta para ${email.subject}:`, replyError);
                        if (replyError.statusCode === 403 || replyError.code === "ErrorAccessDenied") {
                          console.error("\u{1F6A8} EmailProcessor - ERRO DE PERMISS\xC3O: Token n\xE3o tem permiss\xE3o Mail.Send");
                          console.error("\u{1F527} EmailProcessor - SOLU\xC7\xC3O: Fa\xE7a logout e login novamente para obter as permiss\xF5es corretas");
                          console.error("\u{1F4CB} EmailProcessor - Permiss\xF5es necess\xE1rias: User.Read, Mail.Read, Mail.Send, offline_access");
                        }
                        await this.saveProcessedEmailToDB(email, result, "error", replyError.message);
                      }
                    }
                  }
                  if (batchIndex < batches.length - 1) {
                    console.log(`\u23F0 EmailProcessor - Aguardando 5 minutos antes do pr\xF3ximo lote (CONFIGURA\xC7\xC3O CONSERVADORA - EVITA SPAM)...`);
                    await new Promise((resolve) => setTimeout(resolve, 3e5));
                  }
                } catch (error) {
                  console.error(`EmailProcessor - Erro ao processar lote ${batchIndex + 1}:`, error);
                  for (const email of batch) {
                    try {
                      const result = await this.aiService.processEmail(email, this.userId);
                      const processedEmail = {
                        id: email.id,
                        subject: email.subject || "Sem assunto",
                        from: email.from?.emailAddress?.name || email.from?.emailAddress?.address || "Desconhecido",
                        analysis: result.analysis,
                        response: result.response,
                        processedAt: /* @__PURE__ */ new Date(),
                        status: "processed"
                      };
                      this.processedEmails.set(email.id, processedEmail);
                      processedEmails.push(processedEmail);
                      await this.saveProcessedEmailToDB(email, result, "processed");
                      if (result.analysis.shouldReply && result.response) {
                        await this.sendReply(email, result.response);
                        await this.saveProcessedEmailToDB(email, result, "replied");
                      }
                    } catch (individualError) {
                      console.error(`EmailProcessor - Erro ao processar email individual ${email.id}:`, individualError);
                    }
                  }
                }
              }
            }
            console.log(`EmailProcessor - Processamento conclu\xEDdo. ${processedEmails.length} emails processados`);
            return processedEmails;
          } catch (error) {
            console.error("EmailProcessor - Erro no processamento:", error);
            throw error;
          }
        }
        async sendReply(originalEmail, response) {
          try {
            const replyMessage = {
              message: {
                toRecipients: [
                  {
                    emailAddress: {
                      address: originalEmail.from?.emailAddress?.address
                    }
                  }
                ],
                subject: `Re: ${originalEmail.subject}`,
                body: {
                  contentType: "text",
                  content: response
                }
              }
            };
            await this.graphService.sendReply(originalEmail.id, replyMessage);
            await this.graphService.markEmailAsRead(originalEmail.id);
          } catch (error) {
            console.error("EmailProcessor - Erro ao enviar resposta:", error);
            if (error.statusCode === 403 || error.code === "ErrorAccessDenied") {
              console.error("\u{1F6A8} EmailProcessor - ERRO DE PERMISS\xC3O: Token n\xE3o tem permiss\xE3o Mail.Send");
              console.error("\u{1F527} EmailProcessor - SOLU\xC7\xC3O: Fa\xE7a logout e login novamente para obter as permiss\xF5es corretas");
              console.error("\u{1F4CB} EmailProcessor - Permiss\xF5es necess\xE1rias: User.Read, Mail.Read, Mail.Send, offline_access");
            }
            throw error;
          }
        }
        async getProcessedEmails() {
          return Array.from(this.processedEmails.values());
        }
        async getEmailStats() {
          const emails = Array.from(this.processedEmails.values());
          return {
            total: emails.length,
            processed: emails.filter((e) => e.status === "processed").length,
            errors: emails.filter((e) => e.status === "error").length,
            replied: emails.filter((e) => e.response).length
          };
        }
        clearProcessedEmails() {
          this.processedEmails.clear();
        }
        async getProcessedEmailsFromDB() {
          try {
            const response = await fetch(`${process.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-email-polling`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                action: "get_processed_emails",
                user_id: this.userId
              })
            });
            if (!response.ok) {
              console.error("Erro ao buscar emails processados:", response.status);
              return [];
            }
            const data = await response.json();
            return data.processed_emails || [];
          } catch (error) {
            console.error("Erro ao buscar emails processados do banco:", error);
            return [];
          }
        }
        isSystemEmail(email) {
          const fromAddress = email.from?.emailAddress?.address?.toLowerCase() || "";
          const subject = email.subject?.toLowerCase() || "";
          const isOwnEmail = fromAddress === this.userEmail?.toLowerCase();
          if (isOwnEmail) {
            const aiResponsePatterns = [
              "re: re:",
              "re: re: re:",
              "re: re: re: re:",
              "re: re: re: re: re:",
              "re: re: re: re: re: re:"
            ];
            const isAiResponse = aiResponsePatterns.some(
              (pattern) => subject.includes(pattern)
            );
            if (isAiResponse) {
              console.log(`EmailProcessor - Resposta da pr\xF3pria IA detectada, pulando: ${subject}`);
              return true;
            }
            console.log(`EmailProcessor - Email do pr\xF3prio usu\xE1rio (n\xE3o \xE9 resposta da IA): ${fromAddress} - ${subject}`);
            return false;
          }
          const systemPatterns = [
            "noreply",
            "no-reply",
            "donotreply",
            "do-not-reply",
            "account-security-noreply",
            "postmaster",
            "mailer-daemon",
            "bounce",
            "notification",
            "alerts",
            "system",
            "automated",
            "robot",
            "bot"
          ];
          const isSystemAddress = systemPatterns.some(
            (pattern) => fromAddress.includes(pattern)
          );
          const systemSubjects = [
            "undeliverable",
            "delivery status",
            "mail delivery",
            "bounce",
            "notification",
            "alert",
            "security",
            "account",
            "verification",
            "welcome",
            "confirmation"
          ];
          const isSystemSubject = systemSubjects.some(
            (pattern) => subject.includes(pattern)
          );
          const systemDomains = [
            "accountprotection.microsoft.com",
            "microsoft.com",
            "office365.com",
            "azure.com"
          ];
          const isSystemDomain = systemDomains.some(
            (domain) => fromAddress.endsWith(`@${domain}`)
          );
          const isSystem = isSystemAddress || isSystemSubject || isSystemDomain;
          if (isSystem) {
            console.log(`EmailProcessor - Email de sistema detectado: ${fromAddress} - ${subject}`);
          }
          return isSystem;
        }
        async saveProcessedEmailToDB(email, result, status, errorMessage = null) {
          try {
            console.log(`
\u{1F50D} SALVANDO EMAIL NO BANCO:`);
            console.log(`   \u{1F4E7} ID: ${email.id}`);
            console.log(`   \u{1F4DD} Assunto: ${email.subject}`);
            console.log(`   \u{1F4CA} Status: ${status}`);
            console.log(`   \u{1F4C4} Original Content: ${email.body?.content || email.bodyPreview || "N/A"}`);
            console.log(`   \u{1F4C4} Response Text: ${result.response || "N/A"}`);
            const emailAddress = await this.getUserEmailFromConfig();
            console.log(`   \u{1F464} Email do usu\xE1rio: ${emailAddress}`);
            const response = await fetch(`${process.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-email-polling`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                action: "save_processed_email",
                microsoft_message_id: email.id,
                user_id: this.userId,
                connection_email: emailAddress,
                subject: email.subject,
                from_email: email.from?.emailAddress?.address,
                status,
                analysis: result.analysis,
                response_text: result.response,
                original_email_content: email.body?.content || email.bodyPreview || "Conte\xFAdo n\xE3o dispon\xEDvel",
                error_message: errorMessage
              })
            });
            if (!response.ok) {
              console.log(`   \u274C ERRO: ${response.status}`);
              const errorText = await response.text();
              console.log(`   \u274C Detalhes: ${errorText}`);
            } else {
              const responseData = await response.json();
              console.log(`   \u2705 SUCESSO: Email salvo no banco!`);
              console.log(`   \u2705 Resposta: ${JSON.stringify(responseData)}`);
            }
          } catch (error) {
            console.error("Erro ao salvar email processado no banco:", error);
          }
        }
        async getUserEmailFromConfig() {
          try {
            console.log(`   \u{1F50D} Buscando email do usu\xE1rio...`);
            console.log(`   \u{1F50D} this.userId:`, this.userId);
            const response = await fetch(`${process.env.VITE_SUPABASE_FUNCTIONS_URL}/microsoft-email-polling`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`,
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                action: "get_user_email",
                user_id: this.userId
              })
            });
            if (response.ok) {
              const data = await response.json();
              console.log(`   \u2705 Email obtido: ${data.email_address}`);
              return data.email_address || `microsoft-user-${this.userId}`;
            } else {
              console.log(`   \u274C Erro: ${response.status}`);
              const errorText = await response.text();
              console.log(`   \u274C Detalhes: ${errorText}`);
            }
          } catch (error) {
            console.log(`   \u274C Erro: ${error.message}`);
          }
          console.log(`   \u26A0\uFE0F Usando email padr\xE3o: microsoft-user-${this.userId}`);
          return `microsoft-user-${this.userId}`;
        }
      };
      emailProcessor_default = EmailProcessor;
    }
  });

  // project/netlify/functions/emailPollingService.js
  var emailPollingService_exports = {};
  __export(emailPollingService_exports, {
    EmailPollingService: () => EmailPollingService,
    default: () => emailPollingService_default
  });
  var EmailPollingService, emailPollingService_default;
  var init_emailPollingService = __esm({
    "project/netlify/functions/emailPollingService.js"() {
      init_emailProcessor();
      EmailPollingService = class {
        constructor(accessToken, aiApiKey, userId = null, userEmail = null, config = {}) {
          this.processor = new EmailProcessor(accessToken, aiApiKey, userId, userEmail);
          this.config = {
            intervalMinutes: 0.5,
            // Verificar a cada 30 segundos
            maxRetries: 3,
            retryDelayMs: 5e3,
            ...config
          };
          this.intervalId = null;
          this.isRunning = false;
          this.lastCheckTime = null;
          this.processedEmails = /* @__PURE__ */ new Set();
          this.processedCount = 0;
        }
        async start() {
          if (this.isRunning) {
            console.log("\u{1F504} EmailPollingService - J\xE1 est\xE1 rodando");
            return;
          }
          console.log("\u{1F680} EmailPollingService - Iniciando sistema de polling...");
          console.log(`\u{1F504} EmailPollingService - Intervalo: ${this.config.intervalMinutes} minutos`);
          this.isRunning = true;
          this.lastCheckTime = /* @__PURE__ */ new Date();
          await this.checkForNewEmails();
          this.intervalId = setInterval(async () => {
            await this.checkForNewEmails();
          }, this.config.intervalMinutes * 60 * 1e3);
          console.log("\u2705 EmailPollingService - Sistema de polling iniciado");
        }
        async stop() {
          if (!this.isRunning) {
            console.log("\u{1F504} EmailPollingService - J\xE1 est\xE1 parado");
            return;
          }
          console.log("\u23F9\uFE0F EmailPollingService - Parando sistema de polling...");
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          this.isRunning = false;
          console.log("\u2705 EmailPollingService - Sistema de polling parado");
        }
        async checkForNewEmails() {
          try {
            console.log("\u{1F50D} EmailPollingService - Verificando novos emails...");
            console.log(`\u{1F550} EmailPollingService - \xDAltima verifica\xE7\xE3o: ${this.lastCheckTime?.toISOString()}`);
            const processedEmails = await this.processor.processNewEmails();
            const newEmails = processedEmails.filter((email) => !this.processedEmails.has(email.id));
            if (newEmails.length > 0) {
              console.log(`\u{1F4E7} EmailPollingService - ${newEmails.length} novos emails processados`);
              newEmails.forEach((email) => {
                this.processedEmails.add(email.id);
              });
              this.processedCount += newEmails.length;
              newEmails.forEach((email) => {
                console.log(`\u{1F4E7} EmailPollingService - Email: ${email.subject} | Status: ${email.status} | Resposta: ${email.response ? "Sim" : "N\xE3o"}`);
              });
            } else {
              console.log("\u{1F4ED} EmailPollingService - Nenhum email novo encontrado");
            }
            this.lastCheckTime = /* @__PURE__ */ new Date();
          } catch (error) {
            console.error("\u274C EmailPollingService - Erro ao verificar emails:", error);
            await this.handleError(error);
          }
        }
        async handleError(error) {
          console.error("\u{1F504} EmailPollingService - Implementando retry logic...");
          console.error("\u274C EmailPollingService - Erro detalhado:", error instanceof Error ? error.message : "Erro desconhecido");
        }
        getStatus() {
          return {
            isRunning: this.isRunning,
            lastCheckTime: this.lastCheckTime,
            processedCount: this.processedCount,
            config: this.config
          };
        }
        async getStats() {
          try {
            return await this.processor.getEmailStats();
          } catch (error) {
            console.error("Erro ao obter estat\xEDsticas:", error);
            return {
              total: this.processedCount,
              processed: this.processedCount,
              errors: 0,
              replied: 0
            };
          }
        }
        clearProcessedEmails() {
          this.processedEmails.clear();
          console.log("\u{1F5D1}\uFE0F EmailPollingService - Lista de emails processados limpa");
        }
      };
      emailPollingService_default = EmailPollingService;
    }
  });

  // project/netlify/functions/api.js
  var pollingService = null;
  var emailProcessor = null;
  var handler = async (event, context) => {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS"
    };
    if (event.httpMethod === "OPTIONS") {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: ""
      };
    }
    try {
      const { httpMethod, path, headers, body } = event;
      const endpoint = path.replace("/.netlify/functions/api", "").replace("/api/", "");
      console.log(`\u{1F680} API Request: ${httpMethod} /${endpoint}`);
      console.log(`\u{1F680} Full path: ${path}`);
      switch (httpMethod) {
        case "GET":
          if (endpoint === "polling-user" || endpoint === "") {
            return await handleGetPollingStatus(corsHeaders);
          }
          break;
        case "POST":
          if (endpoint === "polling-user" || endpoint === "") {
            return await handleStartPolling(headers, body, corsHeaders);
          }
          break;
        case "PUT":
          if (endpoint === "polling-user" || endpoint === "") {
            return await handleProcessEmails(headers, body, corsHeaders);
          }
          break;
      }
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Endpoint not found",
          availableEndpoints: ["/api/polling-user"],
          currentPath: path,
          extractedEndpoint: endpoint
        })
      };
    } catch (error) {
      console.error("\u274C API Error:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Internal server error",
          details: error.message
        })
      };
    }
  };
  async function handleGetPollingStatus(corsHeaders) {
    try {
      console.log("\u{1F50D} POLLING USER - Verificando status...");
      if (!pollingService) {
        return {
          statusCode: 200,
          headers: corsHeaders,
          body: JSON.stringify({
            success: true,
            isRunning: false,
            message: "Sistema de polling n\xE3o iniciado",
            lastCheckTime: null,
            processedCount: 0
          })
        };
      }
      const status = pollingService.getStatus();
      const stats = await pollingService.getStats();
      console.log("\u{1F50D} POLLING USER - Status:", status);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          isRunning: status.isRunning,
          lastCheckTime: status.lastCheckTime,
          processedCount: status.processedCount,
          config: status.config,
          stats,
          message: status.isRunning ? `Sistema ativo - ${status.processedCount} emails processados` : "Sistema parado"
        })
      };
    } catch (error) {
      console.error("\u274C POLLING USER - Erro ao verificar status:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Erro ao verificar status do polling",
          details: error.message
        })
      };
    }
  }
  async function handleStartPolling(headers, body, corsHeaders) {
    try {
      console.log("\u{1F680} POLLING USER - Iniciando sistema de polling...");
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: "Token de usu\xE1rio n\xE3o fornecido"
          })
        };
      }
      const userToken = authHeader.substring(7);
      console.log("\u{1F680} POLLING USER - Token de usu\xE1rio recebido");
      let userId = null;
      try {
        const tokenParts = userToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub;
          console.log("\u{1F680} POLLING USER - UserId extra\xEDdo do JWT:", userId);
        } else {
          console.log("\u26A0\uFE0F POLLING USER - Token n\xE3o \xE9 um JWT, \xE9 um token de acesso do Microsoft Graph");
          userId = "5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27";
          console.log("\u{1F680} POLLING USER - Usando user_id real do banco:", userId);
        }
      } catch (error) {
        console.log("\u26A0\uFE0F POLLING USER - Erro ao processar token:", error.message);
        userId = "5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27";
        console.log("\u{1F680} POLLING USER - Usando user_id real:", userId);
      }
      const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
      const supabase = createClient2(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
      const { data: config } = await supabase.from("email_configurations").select("email_address").eq("user_id", userId).eq("provider_type", "microsoft").eq("is_active", true).single();
      const userEmail = config?.email_address || null;
      console.log("\u{1F50D} POLLING USER - userEmail encontrado:", userEmail);
      const { EmailProcessor: EmailProcessor2 } = await Promise.resolve().then(() => (init_emailProcessor(), emailProcessor_exports));
      emailProcessor = new EmailProcessor2(userToken, process.env.VITE_GEMINI_API_KEY, userId, userEmail);
      const { EmailPollingService: EmailPollingService2 } = await Promise.resolve().then(() => (init_emailPollingService(), emailPollingService_exports));
      pollingService = new EmailPollingService2(
        userToken,
        process.env.VITE_GEMINI_API_KEY,
        userId,
        userEmail,
        {
          intervalMinutes: 0.5,
          maxRetries: 3,
          retryDelayMs: 5e3
        }
      );
      await pollingService.start();
      const status = pollingService.getStatus();
      const stats = await pollingService.getStats();
      console.log("\u2705 POLLING USER - Sistema de polling iniciado");
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "Sistema de polling iniciado com sucesso",
          isRunning: status.isRunning,
          lastCheckTime: status.lastCheckTime,
          processedCount: status.processedCount,
          config: status.config,
          stats
        })
      };
    } catch (error) {
      console.error("\u274C POLLING USER - Erro ao iniciar polling:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Erro ao iniciar sistema de polling",
          details: error.message
        })
      };
    }
  }
  async function handleProcessEmails(headers, body, corsHeaders) {
    try {
      console.log("\u{1F504} POLLING USER - Processamento manual...");
      const authHeader = headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return {
          statusCode: 401,
          headers: corsHeaders,
          body: JSON.stringify({
            success: false,
            error: "Token de usu\xE1rio n\xE3o fornecido"
          })
        };
      }
      const userToken = authHeader.substring(7);
      console.log("\u{1F504} POLLING USER - Token de usu\xE1rio recebido");
      let userId = null;
      try {
        const tokenParts = userToken.split(".");
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          userId = payload.sub;
          console.log("\u{1F504} POLLING USER - UserId extra\xEDdo do JWT:", userId);
        } else {
          console.log("\u26A0\uFE0F POLLING USER - Token n\xE3o \xE9 um JWT, usando user_id real do banco");
          userId = "5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27";
          console.log("\u{1F504} POLLING USER - Usando user_id real:", userId);
        }
      } catch (error) {
        console.log("\u26A0\uFE0F POLLING USER - Erro ao processar token:", error.message);
        userId = "5682bded-cdbb-4f5e-afcc-bf2a2d8fdd27";
        console.log("\u{1F504} POLLING USER - Usando user_id real:", userId);
      }
      if (!emailProcessor) {
        const { createClient: createClient2 } = await Promise.resolve().then(() => (init_module5(), module_exports));
        const supabase = createClient2(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
        const { data: config } = await supabase.from("email_configurations").select("email_address").eq("user_id", userId).eq("provider_type", "microsoft").eq("is_active", true).single();
        const userEmail = config?.email_address || null;
        console.log("\u{1F50D} POLLING USER - userEmail encontrado:", userEmail);
        const { EmailProcessor: EmailProcessor2 } = await Promise.resolve().then(() => (init_emailProcessor(), emailProcessor_exports));
        emailProcessor = new EmailProcessor2(userToken, process.env.VITE_GEMINI_API_KEY, userId, userEmail);
      }
      console.log("\u{1F504} POLLING USER - Iniciando processamento real de emails...");
      const processedEmails = await emailProcessor.processNewEmails();
      const stats = await emailProcessor.getEmailStats();
      console.log(`\u2705 POLLING USER - ${processedEmails.length} emails processados manualmente`);
      console.log("\u{1F4CA} POLLING USER - Estat\xEDsticas:", stats);
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "Processamento manual conclu\xEDdo",
          processedCount: processedEmails.length,
          stats,
          emails: processedEmails
        })
      };
    } catch (error) {
      console.error("\u274C POLLING USER - Erro no processamento manual:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          success: false,
          error: "Erro no processamento manual",
          details: error.message
        })
      };
    }
  }
})();
