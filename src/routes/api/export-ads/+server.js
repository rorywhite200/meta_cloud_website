import db from '$lib/server/db';
import { json } from '@sveltejs/kit';
import { stringify } from 'csv-stringify/sync';

export async function POST({ request }) {
  try {
    const { ids } = await request.json();

    if (!ids || ids.length === 0) {
      return json({ error: 'No IDs provided' }, { status: 400 });
    }

    // Query the database for ads by ID and join with funders and pages tables
    const [ads] = await db.query(`
      SELECT 
        ads.*, 
        funders.name AS funder_name, 
        pages.name AS page_name,
        IFNULL(DATE_FORMAT(FROM_UNIXTIME(ads.created_date), '%Y-%m-%d %H:%i:%s'), 'N/A') AS created_date,
        IFNULL(DATE_FORMAT(FROM_UNIXTIME(ads.start_date), '%Y-%m-%d %H:%i:%s'), 'N/A') AS start_date,
        IFNULL(DATE_FORMAT(FROM_UNIXTIME(ads.end_date), '%Y-%m-%d %H:%i:%s'), 'N/A') AS end_date
      FROM ads
      LEFT JOIN funders ON ads.funder_id = funders.id
      LEFT JOIN pages ON ads.page_id = pages.id
      WHERE ads.id IN (?)
    `, [ids]);

    // Convert the results to CSV format
    const csvData = stringify(ads, {
      header: true,
      columns: Object.keys(ads[0] || {}), // Use column names from the result of the join query
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