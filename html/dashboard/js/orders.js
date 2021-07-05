//  Discount Chemist
//  Order System Home

import '/order-collect/js/config.js';
import {NotificationBar} from '/common/notification.js';
import {addListener, removeListener, checkLogin} from '/common/tools.js';

window.page = {
  type: null,
  els: {
    username: null,
  },
  notification: new NotificationBar({positionFixed: true}),
  user: {
    id: '',
    username: '',
    password: '',
    firstname: '',
    lastname: '',
    type: '',
  },
  labelNames: {
    new_order: 'New Order',
    partial_order: 'Partial Collect',
    warehouse_order: 'Warehouse Collect',
    collected_order: 'Collected',
    ready_to_pack_order: 'Ready to Pack',
    packed_total_qty_day: 'Packed',
  },
  userToken: localStorage.getItem('usertoken') || '',
  local: window.location.hostname.startsWith('1'),
}

//reload page every 5 minutes
window.setTimeout(function () {
  window.location.reload();
}, 300000);

if (page.local) {
  apiServer = apiServerLocal;
  wsServer = wsServerLocal;
}
var slideIndex = 0;
document.addEventListener('DOMContentLoaded', async function() {

  let storeFilterSelect = document.querySelector('.content-item-stores select');

  for (let storeID in stores) {
    if (['3','5','6','11','12','21','30','34'].includes(storeID)) continue;
    let option = document.createElement('option');
    option.value = storeID;
    option.textContent = stores[storeID].name;
    storeFilterSelect.appendChild(option);
  }

  storeFilterSelect.addEventListener("change", async function() {
    const parent = document.querySelector('.carousel-indicators');
    while (parent.firstChild) {
      parent.firstChild.remove()
    }
    const parent2 = document.querySelector('.carousel-inner');
    while (parent2.firstChild) {
      parent2.firstChild.remove()
    }
    let store = document.querySelector(".content-item-stores select").value;
    if (store != 0){
      slideIndex = 0
      await getOrders(store);
    }
    else {
      location.reload();
    }

  });

  await getOrders(0);

});

async function getOrders(store) {
    let reason = document.getElementById("reason");
    reason.classList.add('hide');
    document.getElementById('loading').style.display = 'block';
    do {
        let response, data;
        let clientId = page.user.id;
        try {
            response = await fetch(apiServer + "orders/stat/"+store, {headers: {'DC-Access-Token': page.userToken}});
            data = await response.json();

            if (!response.ok) {
                page.notification.show("Error: " + data.result);
                break;
            }
        } catch (e) {
              page.notification.show("Error: Could not connect to the server.");
              break;
        }

        document.getElementById("total_new_orders").textContent = data.total_new_orders;
        document.getElementById("total_partial_collect_orders").textContent = data.total_partial_collect_orders;
        document.getElementById("total_warehouse_collect_orders").textContent = data.total_warehouse_collect_orders;
        document.getElementById("total_collected_orders").textContent = data.total_collected_orders;
        document.getElementById("total_ready_to_pack_orders").textContent = data.total_ready_to_pack_orders;
        document.getElementById("total_packed_orders").textContent = data.total_packed_orders;

        /*const options = data.total_new_orders_by_store.map(function(row) {
            return { x: stores[row.store].name, y: row.new_order}
        });

        const options2 = data.total_partial_collect_orders_by_store.map(function(row) {
            return { x: stores[row.store].name, y: row.partial_order}
        });

        const options3 = data.total_warehouse_collect_orders_by_store.map(function(row) {
            return { x: stores[row.store].name, y: row.warehouse_order}
        });
        const options4 = data.total_ready_to_pack_orders_by_store.map(function(row) {
            return { x: stores[row.store].name, y: row.ready_to_pack_order}
        });
        const options5 = data.total_packed_orders_by_store.map(function(row) {
            return { x: stores[row.store].name, y: row.packed_total_qty_day}
        });*/
        if (data.total_new_orders == 0 && data.total_partial_collect_orders == 0 && data.total_warehouse_collect_orders == 0 && data.total_ready_to_pack_orders == 0 && data.total_packed_orders == 0){
            let storeName = document.getElementById("storeName");
            storeName.textContent = stores[store].name;
            reason.classList.remove('hide');
            reason.textContent = 'No order in the database.'
            document.getElementById('loading').style.display = 'none';
            break;
        }
        await createContainers(data.total_by_store);
        await populateContainers(data.total_by_store);
        clearTimeout(showSlides);
        showSlides();
        document.getElementById('loading').style.display = 'none';
              /*let chart = document.createElement('canvas');
              chart.setAttribute('id', 'store-'+storeOrders.store);
              chart.style.maxHeight = "400px";
              chart.style.maxWidth = "25%";
              barCharts.appendChild(chart);*/
    } while (0);

}

  /*for (let storeOrders of data.total_by_store){
    console.log(storeOrders);
    let chart = new JSC.Chart('store-'+storeOrders.store, {
      title_label_text: stores[storeOrders.store].name,
      type: 'column',
      yAxis: { label_text: 'No. Orders' }, 
      defaultPoint_label_text: '%yValue',
      legend_visible: false,
      series: [
        {
          points: [{ x: "New Orders", y: storeOrders.new_order, color: 'blue'}, { x: "Partial Collect", y: storeOrders.partial_order, color: 'orange' }, { x: "Warehouse Collect", y: storeOrders.warehouse_order, color: 'red'}, { x: "Ready to Pack", y: storeOrders.ready_to_pack_order, color: 'yellow'},{ x: "Packed", y: storeOrders.packed_total_qty_day, color: 'green'}]
        }
      ]
    });
    $("#barCharts").append(chart);
  }*/

/*JSC.chart('chartDiv', { 
  debug: true, 
  type: 'column', 
  title_label_text: 'Daily Orders', 
  yAxis: { label_text: 'No. Orders' }, 
  xAxis_label_text: 'Store',

  series: [ 
    { 
      name: 'New Orders', 
      id: 's1', 
      defaultPoint_label_text: '%yValue',
      points: options
    }, 
    { 
      name: 'Partial Collect',
      id: 's2',
      defaultPoint_label_text: '%yValue', 
      points: options2
    }, 
    { 
      name: 'Warehouse Collect', 
      defaultPoint_label_text: '%yValue',
      points: options3
    },
    { 
      name: 'Ready to Pack', 
      defaultPoint_label_text: '%yValue',
      points: options4
    },  
    { 
      name: 'Packed Orders', 
      defaultPoint_label_text: '%yValue',
      points: options5
    } 
  ] 
}); */

	//loadOrdersToPanel("#panel-1", data.latest_orders);
	//loadOrdersToPanel("#panel-2", data.latest_collected_orders);

function getBackgroundColor(n){
    if (n[0] == 'New Order'){
        if (n[1] == 'Partial Collect' || typeof n[1] === 'undefined'){
          return ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Warehouse Collect'){
          return ["rgba(255, 99, 132, 1)", "rgba(255, 99, 132, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Collected'){
          return ["rgba(255, 99, 132, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Ready to Pack'){
          return ["rgba(255, 99, 132, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Packed'){
          return ["rgba(255, 99, 132, 1)", "rgba(75, 192, 192, 1)"];
        }
    }
    else if (n[0] == 'Partial Collect'){
        if (n[1] == 'Warehouse Collect' || typeof n[1] === 'undefined'){
          return ["rgba(54, 162, 235, 1)", "rgba(255, 99, 132, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Collected'){
          return ["rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Ready to Pack'){
          return ["rgba(54, 162, 235, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Packed'){
          return ["rgba(54, 162, 235, 1)", "rgba(75, 192, 192, 1)"];
        }
    }
    else if (n[0] == 'Warehouse Collect'){
        if (n[1] == 'Collected' || typeof n[1] === 'undefined'){
            return ["rgba(255, 99, 132, 1)", "rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Ready to Pack'){
            return ["rgba(255, 99, 132, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Packed'){
            return ["rgba(255, 99, 132, 1)", "rgba(75, 192, 192, 1)"];
        }
    }
    else if (n[0] == 'Collected'){
        if (n[1] == 'Ready to Pack' || typeof n[1] === 'undefined'){
            return ["rgba(255, 206, 86, 1)", "rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
        }
        else if (n[1] == 'Packed'){
            return ["rgba(255, 206, 86, 1)", "rgba(75, 192, 192, 1)"];
        }
        //return ["rgba(75, 192, 192, 1)", "rgba(153, 102, 255, 1)"];
    }
    else if (n[0] == 'Ready to Pack'){
        return ["rgba(153, 102, 255, 1)", "rgba(75, 192, 192, 1)"];
    }
    else if (n[0] == 'Packed'){
        return ["rgba(75, 192, 192, 1)"];
    }
}

function getBorderColor(n){
  /*if (n[0] == 'New Order'){
    if (n[1] == 'Partiall Collect' || typeof n[1] === 'undefined'){
      return ["rgba(255, 99, 132, 2)", "rgba(54, 162, 235, 2)", "rgba(255, 206, 86, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Warehouse Collect'){
      return ["rgba(255, 99, 132, 2)", "rgba(255, 206, 86, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Ready to Pack'){
      return ["rgba(255, 99, 132, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Packed'){
      return ["rgba(255, 99, 132, 2)", "rgba(153, 102, 255, 2)"];
    }
  }
  else if (n[0] == 'Partiall Collect'){
    if (n[1] == 'Warehouse Collect' || typeof n[1] === 'undefined'){
      return ["rgba(54, 162, 235, 2)", "rgba(255, 206, 86, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Ready to Pack'){
      return ["rgba(54, 162, 235, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Packed'){
      return ["rgba(54, 162, 235, 2)", "rgba(153, 102, 255, 2)"];
    }
  }
  else if (n[0] == 'Warehouse Collect'){
    if (n[1] == 'Ready to Pack' || typeof n[1] === 'undefined'){
      return ["rgba(255, 206, 86, 2)", "rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
    }
    else if (n[1] == 'Packed'){
      return ["rgba(255, 206, 86, 2)", "rgba(153, 102, 255, 2)"];
    }
  }
  else if (n[0] == 'Ready to Pack' || typeof n[1] === 'undefined'){
    return ["rgba(75, 192, 192, 2)", "rgba(153, 102, 255, 2)"];
  }
  else if (n[0] == 'Packed'){
    return ["rgba(153, 102, 255, 2)"];
  }*/
  return ["rgba(black, 2)","rgba(black, 2)","rgba(black, 2)","rgba(black, 2)","rgba(black, 2)","rgba(black, 2)"];
}

function createContainers(total_by_store){
  let barCharts = document.getElementById("barCharts");
  let ol = document.querySelector('.carousel-indicators');
  let firstOne = true;
  for (let i=0; i < total_by_store.length; i++){
    let li = document.createElement('li');
    li.dataset.target = '#carousel-example-generic';
    li.dataset.slideTo = i;
    if (i == 0){
      li.classList.add('active');
    }
    ol.appendChild(li);
  }
  let carouselInner = document.querySelector('.carousel-inner');
  for (let storeOrders of total_by_store){
      let div1 = document.createElement('div');
      
      div1.classList.add('item');
      /*if (firstOne == true){
        div1.classList.add('active');
        firstOne = false;
      }*/
      let div2 = document.createElement('canvas');
      div2.setAttribute('id', 'store-'+storeOrders.store);
      //div2.setAttribute('class', 'chart');
      div2.style.maxWidth = "1500px";
      div2.style.maxHeight = "100%";
      div1.appendChild(div2);
      carouselInner.appendChild(div1);
  }
}

function populateContainers(total_by_store){

  for (let storeOrders of total_by_store){
    let labels = Object.getOwnPropertyNames(storeOrders).slice(1);
    let labelsConverted = [];
    for (let label of labels){
      label = page.labelNames[label];
      labelsConverted.push(label);
    }

    let ctx0 = document.getElementById('store-'+storeOrders.store).getContext('2d');

    new Chart(ctx0, {
      type: "bar",
      data: {
        labels: labelsConverted,
        datasets: [
          {
            label: stores[storeOrders.store].name,
            data: Object.values(storeOrders).slice(1),
            backgroundColor: getBackgroundColor(labelsConverted),
            borderColor:  getBorderColor(labelsConverted),
            borderWidth: 1
          }
        ]
      },
      options: {
        layout: {
            padding: {
                left: 0,
                right: 0,
                top: 60,
                bottom: 0
            }
        },
        legend: {
          display: false,
        },
        scales: {
          yAxes: [{
            ticks: {
              fontSize: 20,
              beginAtZero: true,
              callback: function(value) {if (value % 1 === 0) {return value;} },
              //max: Math.max.apply(null, Object.values(storeOrders).slice(1))+10
            },
            gridLines : {
                        display : false
                    }
          }],
          xAxes: [{
            ticks: {
              fontSize: 40
            },
            barPercentage: 0.2,
          }]
        },
        animation: {
                duration : 1,
                onComplete : function() {
                    var chartInstance = this.chart,
                    ctx = chartInstance.ctx;

                    ctx.font = Chart.helpers.fontString(60, Chart.defaults.global.defaultFontStyle, Chart.defaults.global.defaultFontFamily);
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';

                    this.data.datasets.forEach(function(dataset, i) {
                        var meta = chartInstance.controller.getDatasetMeta(i);
                        meta.data.forEach(function(bar, index) {
                            if (dataset.data[index] > 0) {
                                var data = dataset.data[index];
                                ctx.fillText(data, bar._model.x, bar._model.y);
                            }
                        });
                    });
                }
            }
      }
    });

  }

}

function showSlides() {
    let reason = document.getElementById("reason");
    if (reason.classList.contains('hide') == true){
        var i;
        var slides = document.querySelectorAll('canvas');
        //console.log(slides);
        for (let slide of slides) {
            slide.style.display = "none";
        }
        slideIndex++;
        if (slideIndex > slides.length) {
            slideIndex = 1
        }
        slides[slideIndex-1].style.display = "block";
        let storeName = document.getElementById("storeName");
        storeName.textContent = stores[slides[slideIndex-1].id.slice(6)].name;
        if (slides.length > 1){
            setTimeout(showSlides, 4000); // Change image every 2 seconds
        }
    }
    else{
        return;
    }
}