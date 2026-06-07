<script setup lang="ts">
export interface Sop1Row {
  workOrderNo: string
  jiuqiuOrderNo: string
  orderStatus: string
  pgi: string
  s4OrderNo: string
  pgiSscmTime: string
  btcpOrderNo: string
  invoiceStatus: string
  invoiceType: string
  invoiceLink: string
}

defineProps<{ rows: Sop1Row[] }>()
</script>

<template>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>工单号</th>
          <th>九丘订单号</th>
          <th>九丘状态</th>
          <th>PGI</th>
          <th>S4 订单号</th>
          <th>SSCM 时间</th>
          <th>BTCP</th>
          <th>开票状态</th>
          <th>发票类型</th>
          <th>发票链接</th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length">
          <td colspan="10" class="empty-cell">运行后展示查询结果</td>
        </tr>
        <tr v-for="(row, idx) in rows" :key="`${row.pgi}-${row.s4OrderNo}-${idx}`">
          <td>{{ row.workOrderNo }}</td>
          <td>{{ row.jiuqiuOrderNo }}</td>
          <td><span class="pill success">{{ row.orderStatus }}</span></td>
          <td>{{ row.pgi }}</td>
          <td>{{ row.s4OrderNo }}</td>
          <td>{{ row.pgiSscmTime }}</td>
          <td>{{ row.btcpOrderNo }}</td>
          <td><span class="pill success">{{ row.invoiceStatus }}</span></td>
          <td>{{ row.invoiceType }}</td>
          <td>{{ row.invoiceLink }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
