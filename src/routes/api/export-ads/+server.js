import db from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { stringify } from 'csv-stringify/sync';

const BATCH_SIZE = 4000;

export async function POST({ request }) {
    try {
        const { ids } = await request.json();
        if (!ids || ids.length === 0) {
            return json({ error: 'No IDs provided' }, { status: 400 });
        }

        // Set session timezone to UTC
        await db.query(`SET time_zone='+00:00';`);

        // Process in batches
        const allAds = [];
        for (let i = 0; i < ids.length; i += BATCH_SIZE) {
            const batchIds = ids.slice(i, i + BATCH_SIZE);
            // Create the parameterized query with the correct number of placeholders
            const placeholders = batchIds.map(() => '?').join(',');
            
            const [batchAds] = await db.query(`
                SELECT
                    ads.id,
                    ads.body AS ad_body,
                    DATE_FORMAT(ads.start_date, '%Y-%m-%d %H:%i:%s') AS start_date,
                    DATE_FORMAT(ads.end_date, '%Y-%m-%d %H:%i:%s') AS end_date,
                    COALESCE(funders.name, 'Unknown') AS funder_name,
                    ads.funder_id AS funder_id,
                    COALESCE(pages.name, 'Unknown') AS page_name,
                    ads.page_id AS page_id,
                    ads.currency,
                    ads.audience_min,
                    ads.audience_max,
                    ads.views_min,
                    ads.views_max,
                    ads.cost_min,
                    ads.cost_max,
                    ads.link_title,
                    ads.link_url,
                    ads.description,
                    ads.provinces,
                    ads.demographics,
                    ads.platforms,
                    ads.languages
                FROM ads
                LEFT JOIN funders ON ads.funder_id = funders.id
                LEFT JOIN pages ON ads.page_id = pages.id
                WHERE ads.id IN (${placeholders})
                ORDER BY ads.id
            `, batchIds);

            // Add the URL after getting the data
            const adsWithUrls = batchAds.map(ad => ({
                ad_url: `https://www.facebook.com/ads/library/?id=${ad.id}`,
                ...ad
            }));

            allAds.push(...adsWithUrls);
        }

        if (allAds.length === 0) {
            return json({ error: 'No ads found' }, { status: 404 });
        }

        // Convert the results to CSV format
        const csvData = stringify(allAds, {
            header: true
        });

        // Return the CSV as a downloadable file
        return new Response(csvData, {
            headers: {
                'Content-Type': 'text/csv',
                'Content-Disposition': `attachment; filename="ads_${new Date().toISOString().split('T')[0]}.csv"`,
            },
        });
    } catch (error) {
        console.error('Error generating CSV:', error);
        return json({ error: 'Failed to generate CSV' }, { status: 500 });
    }
}