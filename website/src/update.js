function updateStats() {
  const xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText);
        document.getElementById("Benign").querySelector("dd").innerText = data.Benign;
        document.getElementById("Volume").querySelector("dd").innerText = data.Volume;
        document.getElementById("Application").querySelector("dd").innerText = data.Application;

        if (typeof ApexCharts !== 'undefined') {
          
          chart.updateSeries(data.chartData.series);
        } else {
          console.error('ApexCharts library is not available.');
        }
      } else {
        console.error('Error fetching data:', xhr.status);
      }
    }
  };
  xhr.open('GET', 'http://localhost:3000/stats', true);
  xhr.send();

  const xhr2 = new XMLHttpRequest();
  xhr2.onreadystatechange = function() {
    if (xhr2.readyState === XMLHttpRequest.DONE) {
      if (xhr2.status === 200) {
        const data = JSON.parse(xhr2.responseText);
        updateTable(data);
      } else {
        console.error('Error fetching data:', xhr2.status);
      }
    }
  };
  xhr2.open('GET', 'http://localhost:3000/conexions', true);
  xhr2.send();

}

function getChartOptions() {
  return {
    series: [0,0,0],
    colors: ["#1C64F2", "#16BDCA", "#9061F9"],
    chart: {
      height: 420,
      width: "100%",
      type: "pie",
      animations: {
        enabled: false
      }
    },
    stroke: {
      colors: ["white"],
      lineCap: "",
    },
    plotOptions: {
      pie: {
        labels: {
          show: true,
        },
        size: "100%",
        dataLabels: {
          offset: -25
        }
      },
    },
    labels: ["Benign", "Volume", "Application"],
    dataLabels: {
      enabled: true,
      style: {
        fontFamily: "Inter, sans-serif",
      },
    },
    legend: {
      position: "bottom",
      fontFamily: "Inter, sans-serif",
      labels: {
        colors: "white",
      },
    },
    yaxis: {
      labels: {
        formatter: function (value) {
          return value + "%"
        },
      },
    },
    xaxis: {
      labels: {
        formatter: function (value) {
          return value  + "%"
        },
      },
      axisTicks: {
        show: false,
      },
      axisBorder: {
        show: false,
      },
    },
  };
}

function updateTable(data) {
  const table = document.getElementById('product-table').getElementsByTagName('tbody')[0];
  table.innerHTML = '';
  
  data.forEach((row) => {
    console.log(row)
    addRow(table, row);
  });
}
temp = null
function addRow(table, row) {
  const newRow = table.insertRow(-1);
  newRow.className = 'bg-white border-b dark:bg-gray-800 dark:border-gray-700';

  const properties = Object.keys(row);

  properties.forEach(property => {
    const cell = newRow.insertCell();
    cell.className = 'px-6 py-4';
    cell.textContent = row[property];
  });

  return newRow;
}

chart = null
if (typeof ApexCharts !== 'undefined') {
  const chartOptions = getChartOptions();
  chart = new ApexCharts(document.getElementById("pie-chart"), chartOptions);
  chart.render();
} else {
  console.error('ApexCharts library is not available.');
}

updateStats();
setInterval(updateStats, 5000);
