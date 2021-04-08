import {authorization} from "../auth";

const dataTypes = {
    async json(res) {
        await res.json();
    }
};
Http.interceptor = {
    response: {
        __interceptors: [],
        use(interceptor) {
            this.__interceptors.push(interceptor)
        }
    },
    request: {
        __interceptors: [],
        use(interceptor) {
            this.__interceptors.push(interceptor);
        }
    }
};


Http.interceptor.response.use(async function (res) {
    return await res.json();
});


function Http(req, data = {}, headers = {"content-type": 'application/x-www-form-urlencoded'}, timeout = 30000) {
    if (!(this instanceof Http)) {
        return new Http(...arguments);
    }
    let [method, url] = req.split('|');
    if (!url) {
        url = method;
        method = 'get';
    }
    this.path = url;
    this.debugs = [];
    this.dataType = dataTypes['json'];
    this.baseUrl = `${config.apiHost}${url}`;
    this.method = method.toUpperCase();
    this.params = data;
    this.headers = headers;
    this.timeout = timeout;  // 给timeout一个初始值,默认是30000
    this.interceptor = {
        responses: Http.interceptor.response.__interceptors,
        requests: Http.interceptor.request.__interceptors,
    };
    this.promise = null;
    this.debug('create http instrance');
    return this;
}

Http.prototype.withHeaders = function (headers) {
    this.debug(`add headers ${JSON.stringify(headers)}`);
    this.headers = Object.assign(this.headers || {}, headers || {});
};

Http.prototype.isMethod = function (method) {
    return this.method === method.toUpperCase();
};


Http.prototype.finally = function (fun) {
    if(!this.promise){
        this.triggerRequest();
    }
    this.promise.finally(fun);
};

Http.prototype.setTimeout = function(timeout = 30000){
    this.timeout = timeout;
};

Http.prototype.printDebug = function(){
    for(const debug of this.debugs){
        console.log(debug.time, debug.log);
    }
};
Http.prototype.debug = function(log){
    this.debugs.push({time:new Date().format(),log});
}

Http.prototype.triggerRequest = function () {
    this.debug('trigger request');
    this.promise = new Promise((succ, fail) => {
        let body = null;
        let req = null;

        const httpHeaders = {...this.headers, 'Lang':sessionStorage.getItem('lang')||'zh'};

        const myHeaders = new Headers(httpHeaders);
        switch (this.method) {
            case 'GET':
                console.log(obj2geturl(this.baseUrl, this.params));
                req = new Request(obj2geturl(this.baseUrl, this.params), {
                    method:this.method,
                    headers:myHeaders,
                    mode:'cors'});
                break;
            default:
                switch (this.headers["content-type"]) {
                    case 'urlencoded':
                    case 'application/x-www-form-urlencoded':
                        body = obj2url(this.params);
                        break;
                    case 'json':
                    case 'application/json':
                        body = obj2json(this.params);
                        break;
                    case 'form':
                    case 'multipart/form-data':
                        let formData = new FormData;
                        for (let i in this.params) {
                            if (this.params.hasOwnProperty(i)) {
                                formData.append(i, this.params[i]);
                            }
                        }
                        body = formData;
                        break;
                    default:
                        console.error(`fetch contentType not support ${header.contentType}`)
                }
                const reqOptions = {
                    mode: 'cors',
                    method: this.method,
                    headers: myHeaders,
                    body
                };
                req = new Request(`${this.baseUrl}`, reqOptions);
        }

        const requests = this.interceptor.request || [];
        for (const request of requests) {
            req = request(req);
        }
        const timer = setTimeout(() =>{
            fail(`api ${this.method} ${this.baseUrl} timeout ${this.timeout}ms`);
            if(!window.timeoutApis){
                window.timeoutApis = [];
            }
            window.timeoutApis.push(this);
        }, this.timeout);
        fetch(req).then(async res => {
            clearTimeout(timer);
            const responses = this.interceptor.responses || [];
            let result;
            for (const response of responses) {
                result = await response.call(this, res);
            }
            if (res.status === 200) {
                this.debug('request sucess');
                succ(result);
            } else {
                this.debug('request fail');
                fail(result)
            }
        }).catch(err => {
            clearTimeout(timer);
            fail(err)
        });
        return this;
    })
};
Http.prototype.then = function (callback) {
    if (!this.promise) {
        this.triggerRequest();
    }
    this.promise.then(callback);
    return this;
};

Http.prototype.catch = function (callback) {
    if (!this.promise) {
        this.triggerRequest();
    }
    this.promise.catch(callback);
    return this;
};
export default Http;
