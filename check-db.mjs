import { Sequelize } from 'sequelize';

const s = new Sequelize('admin_evaluation','admin_evaluation','S_d3kp731',{
  dialect:'mysql', host:'49.13.192.32', port:3306, logging:false
});

try {
  await s.authenticate();
  console.log('Connected OK');

  const [cols] = await s.query('DESCRIBE attendance');
  console.log('Columns:', cols.map(c => `${c.Field}(${c.Key})`).join(', '));

  const [cnt] = await s.query('SELECT COUNT(*) as n FROM attendance');
  console.log('Row count:', cnt[0].n);

  const [rows] = await s.query('SELECT * FROM attendance LIMIT 20');
  console.log('Sample rows:', JSON.stringify(rows, null, 2));

  const [bl] = await s.query("SHOW VARIABLES LIKE 'log_bin'");
  console.log('log_bin:', bl[0]);

  if (bl[0] && bl[0].Value === 'ON') {
    const [logs] = await s.query('SHOW BINARY LOGS');
    console.log('Binary logs:', JSON.stringify(logs));
  }

} catch(e) {
  console.error('ERROR:', e.message);
}
await s.close();
