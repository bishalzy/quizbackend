import client from 'prom-client'

client.collectDefaultMetrics();


const apiMetricsMiddleware = (req: any, res: any, next: any) => {
    const httpRequestCounter = new client.Counter({
        name: 'http_request_total',
        help: 'Total number of HTTP requests',
        labelNames: ['method', 'route', 'status_code']
    });

    const httpRequestDurationHistogram = new client.Histogram({
        name: 'http_request_duration_seconds',
        help: 'Duration of HTTP requests in seconds',
        labelNames: ['method', 'route', 'status_code'],
        buckets: [0.1, 0.5, 1, 2, 5, 10] // Define your buckets for response time
    });

    const end = httpRequestDurationHistogram.startTimer();
    res.on('finish', () => {
        end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
        httpRequestCounter.inc({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
    });

    next();

}


export {    apiMetricsMiddleware };