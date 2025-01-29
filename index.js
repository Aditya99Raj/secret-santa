const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');

// Helper function to read a CSV file
function readCSV(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Helper function to write to a CSV file
function writeCSV(filePath, data, headers) {
  const csvContent = [headers.join(',')].concat(
    data.map((row) =>
      headers.map((header) => row[header] || '').join(',')
    )
  ).join('\n');

  fs.writeFileSync(filePath, csvContent, 'utf8');
}

function generateAssignments(employees, previousAssignments) {
  const prevMapping = {};
  previousAssignments.forEach((assignment) => {
    prevMapping[assignment.Employee_EmailID] = assignment.Secret_Child_EmailID;
  });

  const employeeEmails = employees.map((emp) => emp.Employee_EmailID);
  const shuffledEmails = [...employeeEmails];

  // Shuffle emails until valid assignments are generated
  let attempts = 0;
  while (attempts < 100) {
    attempts++;
    shuffleArray(shuffledEmails);

    const isValid = employees.every((emp, idx) => {
      const secretChildEmail = shuffledEmails[idx];
      return (
        secretChildEmail !== emp.Employee_EmailID && // Not self-assigned
        secretChildEmail !== prevMapping[emp.Employee_EmailID] // Not the same as last year
      );
    });

    if (isValid) {
      break;
    }
  }

  if (attempts === 100) {
    throw new Error('Unable to generate valid Secret Santa assignments after 100 attempts.');
  }

  // Map assignments to employees
  return employees.map((emp, idx) => {
    const secretChild = employees.find(
      (child) => child.Employee_EmailID === shuffledEmails[idx]
    );

    return {
      Employee_Name: emp.Employee_Name,
      Employee_EmailID: emp.Employee_EmailID,
      Secret_Child_Name: secretChild.Employee_Name,
      Secret_Child_EmailID: secretChild.Employee_EmailID,
    };
  });
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}


async function main() {
  try {
    const employees = await readCSV(path.resolve(__dirname, 'employees.csv'));
    const previousAssignments = await readCSV(path.resolve(__dirname, 'secret-santa-2023.csv'));

    const assignments = generateAssignments(employees, previousAssignments);

    const outputHeaders = [
      'Employee_Name',
      'Employee_EmailID',
      'Secret_Child_Name',
      'Secret_Child_EmailID',
    ];

    writeCSV(path.resolve(__dirname, 'secret-santa-2023.csv'), assignments, outputHeaders);

    console.log('Secret Santa assignments generated successfully!');
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
