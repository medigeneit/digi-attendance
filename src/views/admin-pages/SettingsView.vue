<script setup></script>
<template>
  <div class="grid gap-4 md:grid-cols-4 px-4">
    <RouterLink :to="{ name: 'UserList' }" class="main-button">
      <i class="fas fa-users text-3xl"></i>
      User List
    </RouterLink>
    <RouterLink :to="{ name: 'HoliDayList' }" class="main-button">
      <i class="fas fa-mosque text-3xl"></i>
      Holiday List
    </RouterLink>
    <RouterLink :to="{ name: 'LeaveApprovalList' }" class="main-button">
      <i class="fas fa-users-class text-3xl"></i>
      Leave Approval List
    </RouterLink>
    <RouterLink :to="{ name: 'OtherApprovalList' }" class="main-button">
      <i class="fas fa-users-class text-3xl"></i>
      Other Approval List
    </RouterLink>
    <RouterLink :to="{ name: 'LeaveTypeList' }" class="main-button">
      <i class="fas fa-list text-3xl"></i>
      Leave Type List
    </RouterLink>
    <RouterLink :to="{ name: 'ShiftList' }" class="main-button">
      <i class="fas fa-calendar-alt text-3xl"></i>
      Shift List
    </RouterLink>
    <RouterLink :to="{ name: 'DesignationList' }" class="main-button">
      <i class="fas fa-layer-group text-3xl"></i>
      Designation List
    </RouterLink>
    <RouterLink :to="{ name: 'DepartmentList' }" class="main-button">
      <i class="fas fa-puzzle-piece text-3xl"></i>
      Department List
    </RouterLink>
    <RouterLink :to="{ name: 'CompanyList' }" class="main-button">
      <i class="fas fa-building text-3xl"></i>
      Company List
    </RouterLink>
    <RouterLink :to="{ name: 'DeviceList' }" class="main-button">
      <i class="fas fa-cash-register text-3xl"></i>
      Device List
    </RouterLink>
    <RouterLink :to="{ name: 'ZKUsers' }" class="main-button">
      <i class="fas fa-users text-3xl"></i>
      ZK User Management
    </RouterLink>
    <RouterLink :to="{ name: 'PermissionList' }" class="main-button">
      <i class="fas fa-users text-3xl"></i>
      Permission List
    </RouterLink>
    <RouterLink :to="{ name: 'KpiMonthlyList' }" class="main-button">
      <i class="far fa-file-chart-line text-3xl"></i>
      Monthly KPI Criteria
    </RouterLink>

    <RouterLink :to="{ name: 'ctdi', query:{templateId:2} }" class="main-button">
      <i class="far fa-tasks text-3xl"></i>
      Template Items Assign
    </RouterLink>
  </div>
</template>
