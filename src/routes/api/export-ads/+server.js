import db from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { stringify } from 'csv-stringify/sync';

export async function POST({ request }) {
  try {
    const { ids } = await request.json();

    if (!ids || ids.length === 0) {
      return json({ error: 'No IDs provided' }, { status: 400 });
    }

    // Set session timezone to UTC and fetch ads in UTC
    await db.query(`SET time_zone='+00:00';`);
    const [ads] = await db.query(`
      SELECT 
        ads.body AS ad_body,
        funders.name AS funder_name, 
        ads.*,
        pages.name AS page_name,
        DATE_FORMAT(ads.created_date, '%Y-%m-%d %H:%i:%s') AS created_date,
        DATE_FORMAT(ads.start_date, '%Y-%m-%d %H:%i:%s') AS start_date,
        DATE_FORMAT(ads.end_date, '%Y-%m-%d %H:%i:%s') AS end_date
      FROM ads
      LEFT JOIN funders ON ads.funder_id = funders.id
      LEFT JOIN pages ON ads.page_id = pages.id
      WHERE ads.id IN (?)
    `, [ids]);

    // Convert the results to CSV format with specific types for date columns
    const csvData = stringify(ads, {
      header: true,
      columns: {
        ad_body: 'Ad Body',
        funder_name: 'Funder Name',
        created_date: 'Created Date',
        start_date: 'Start Date',
        end_date: 'End Date',
        page_name: 'Page Name',
        ...Object.fromEntries(Object.keys(ads[0] || {}).filter(col => !['ad_body', 'funder_name', 'created_date', 'start_date', 'end_date', 'page_name'].includes(col)).map(col => [col, col]))
      }
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