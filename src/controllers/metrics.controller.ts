import client from 'prom-client';


const getMetrics = async (req: any, res: any) => {
    try {
        const metrics = await client.register.metrics();
        res.set('Content-Type', client.register.contentType);
        res.end(metrics);
    } catch (error) {
        console.error('Error fetching metrics:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export default getMetrics;