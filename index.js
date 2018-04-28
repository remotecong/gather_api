const gather = require('./gather');
gather(process.argv[2])
    .then(data => console.log('DONE:', data))
    .catch(err => console.error('FAIL:', err));
