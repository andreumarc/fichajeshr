import * as path from 'path';
import * as dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

import { PrismaClient, UserRole, ClockMethod, EmployeeStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ---- Clean existing data (dev only) ----
  await prisma.auditLog.deleteMany();
  await prisma.deviceLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.whatsAppConversation.deleteMany();
  await prisma.whatsAppTemplate.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.breakRecord.deleteMany();
  await prisma.timeEntry.deleteMany();
  await prisma.employeeCredential.deleteMany();
  await prisma.employeeSchedule.deleteMany();
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.geofenceRule.deleteMany();
  await prisma.workScheduleDay.deleteMany();
  await prisma.workSchedule.deleteMany();
  await prisma.workCenter.deleteMany();
  await prisma.company.deleteMany();

  const passwordHash = await bcrypt.hash('Admin123!', 12);
  const demoPasswordHash = await bcrypt.hash('Demo2026!', 12);

  // ---- SUPERADMIN ----
  const superadminEmail    = process.env.SUPERADMIN_EMAIL    ?? 'superadmin@fichajeshr.app';
  const superadminPassword = process.env.SUPERADMIN_PASSWORD ?? 'FichajeHR2026!';
  await prisma.user.create({
    data: {
      email: superadminEmail,
      passwordHash: await bcrypt.hash(superadminPassword, 12),
      firstName: 'Super',
      lastName: 'Admin',
      role: UserRole.SUPERADMIN,
      isActive: true,
    },
  });
  console.log(`✅ Superadmin created: ${superadminEmail}`);

  // ---- COMPANY 1: TechCorp ----
  const company1 = await prisma.company.create({
    data: {
      name: 'TechCorp Solutions SL',
      taxId: 'B12345678',
      email: 'admin@techcorp.es',
      phone: '+34 91 123 4567',
      address: 'Calle Gran Vía 28',
      city: 'Madrid',
      country: 'ES',
      timezone: 'Europe/Madrid',
      isActive: true,
      settings: { allowOfflineClock: true, requirePhoto: false },
    },
  });

  // ---- WORK CENTERS ----
  const center1 = await prisma.workCenter.create({
    data: {
      companyId: company1.id,
      name: 'Oficina Madrid Central',
      code: 'MAD-01',
      address: 'Calle Gran Vía 28',
      city: 'Madrid',
      latitude: 40.420348,
      longitude: -3.705083,
      radiusMeters: 200,
      timezone: 'Europe/Madrid',
      isActive: true,
      requireGps: true,
    },
  });

  const center2 = await prisma.workCenter.create({
    data: {
      companyId: company1.id,
      name: 'Oficina Barcelona',
      code: 'BCN-01',
      address: 'Passeig de Gràcia 43',
      city: 'Barcelona',
      latitude: 41.395063,
      longitude: 2.161680,
      radiusMeters: 150,
      timezone: 'Europe/Madrid',
      isActive: true,
      requireGps: true,
    },
  });

  // ---- GEOFENCE RULES ----
  await prisma.geofenceRule.create({
    data: {
      companyId: company1.id,
      workCenterId: center1.id,
      name: 'Madrid Central Geofence',
      latitude: 40.420348,
      longitude: -3.705083,
      radiusMeters: 200,
      toleranceMeters: 50,
      isActive: true,
      blockOutOfZone: false,
      allowException: true,
    },
  });

  // ---- EMPLOYEES ----
  const pinHash1 = await bcrypt.hash('1234', 12);
  const pinHash2 = await bcrypt.hash('5678', 12);
  const pinHash3 = await bcrypt.hash('9012', 12);

  const emp1 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      workCenterId: center1.id,
      firstName: 'Ana',
      lastName: 'García López',
      fullName: 'Ana García López',
      dni: '12345678A',
      email: 'ana.garcia@techcorp.es',
      phone: '+34 600 111 222',
      employeeCode: 'EMP-001',
      department: 'Tecnología',
      position: 'Desarrolladora Senior',
      hireDate: new Date('2021-03-01'),
      status: EmployeeStatus.ACTIVE,
      allowedMethods: [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN, ClockMethod.QR_CODE],
      allowMobile: true,
      allowWeb: true,
      allowKiosk: true,
      weeklyHours: 40,
    },
  });

  const emp2 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      workCenterId: center1.id,
      supervisorId: emp1.id,
      firstName: 'Carlos',
      lastName: 'Martínez Ruiz',
      fullName: 'Carlos Martínez Ruiz',
      dni: '87654321B',
      email: 'carlos.martinez@techcorp.es',
      phone: '+34 600 333 444',
      employeeCode: 'EMP-002',
      department: 'Tecnología',
      position: 'Desarrollador Junior',
      hireDate: new Date('2023-01-15'),
      status: EmployeeStatus.ACTIVE,
      allowedMethods: [ClockMethod.PIN, ClockMethod.EMPLOYEE_CODE],
      allowMobile: true,
      allowWeb: true,
      allowKiosk: true,
      weeklyHours: 40,
    },
  });

  const emp3 = await prisma.employee.create({
    data: {
      companyId: company1.id,
      workCenterId: center2.id,
      firstName: 'María',
      lastName: 'Fernández Castro',
      fullName: 'María Fernández Castro',
      dni: '11223344C',
      email: 'maria.fernandez@techcorp.es',
      phone: '+34 600 555 666',
      employeeCode: 'EMP-003',
      department: 'Ventas',
      position: 'Account Manager',
      hireDate: new Date('2022-06-01'),
      status: EmployeeStatus.ACTIVE,
      allowedMethods: [ClockMethod.EMAIL_PASSWORD, ClockMethod.PIN],
      allowMobile: true,
      allowWeb: true,
      allowKiosk: true,
      weeklyHours: 40,
    },
  });

  // ---- EMPLOYEE CREDENTIALS (PIN) ----
  await prisma.employeeCredential.create({
    data: { employeeId: emp1.id, method: ClockMethod.PIN, secret: pinHash1 },
  });
  await prisma.employeeCredential.create({
    data: { employeeId: emp2.id, method: ClockMethod.PIN, secret: pinHash2 },
  });
  await prisma.employeeCredential.create({
    data: { employeeId: emp3.id, method: ClockMethod.PIN, secret: pinHash3 },
  });

  // QR token for emp1
  await prisma.employeeCredential.create({
    data: {
      employeeId: emp1.id,
      method: ClockMethod.QR_CODE,
      secret: `QR-${company1.id}-${emp1.id}-STATIC`,
    },
  });

  // ---- USERS (system login) ----
  const adminUser = await prisma.user.create({
    data: {
      companyId: company1.id,
      email: 'admin@techcorp.es',
      passwordHash,
      firstName: 'Admin',
      lastName: 'TechCorp',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const hrUser = await prisma.user.create({
    data: {
      companyId: company1.id,
      email: 'rrhh@techcorp.es',
      passwordHash,
      firstName: 'Recursos',
      lastName: 'Humanos',
      role: UserRole.RRHH,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      companyId: company1.id,
      employeeId: emp1.id,
      email: 'ana.garcia@techcorp.es',
      passwordHash,
      firstName: 'Ana',
      lastName: 'García',
      role: UserRole.AUXILIAR,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      companyId: company1.id,
      employeeId: emp2.id,
      email: 'carlos.martinez@techcorp.es',
      passwordHash,
      firstName: 'Carlos',
      lastName: 'Martínez',
      role: UserRole.AUXILIAR,
      isActive: true,
    },
  });

  await prisma.user.create({
    data: {
      companyId: company1.id,
      employeeId: emp3.id,
      email: 'maria.fernandez@techcorp.es',
      passwordHash,
      firstName: 'María',
      lastName: 'Fernández',
      role: UserRole.AUXILIAR,
      isActive: true,
    },
  });

  // ---- DEMO USER (solo lectura, sin empresa asignada) ----
  await prisma.user.create({
    data: {
      email: 'demo@impulsodent.com',
      passwordHash: demoPasswordHash,
      firstName: 'Demo',
      lastName: 'ImpulsoDent',
      role: UserRole.AUXILIAR,
      isActive: true,
    },
  });

  // ---- SAMPLE TIME ENTRIES (last 7 days) ----
  const now = new Date();
  const employees = [emp1, emp2, emp3];
  const centers = [center1, center1, center2];

  for (let day = 6; day >= 1; day--) {
    const date = new Date(now);
    date.setDate(date.getDate() - day);

    // Skip weekends
    if (date.getDay() === 0 || date.getDay() === 6) continue;

    for (let i = 0; i < employees.length; i++) {
      const emp = employees[i];
      const wc = centers[i];

      const checkIn = new Date(date);
      checkIn.setHours(9, Math.floor(Math.random() * 15), 0, 0);

      const breakStart = new Date(date);
      breakStart.setHours(13, 0, 0, 0);
      const breakEnd = new Date(date);
      breakEnd.setHours(14, 0, 0, 0);
      const checkOut = new Date(date);
      checkOut.setHours(18, Math.floor(Math.random() * 30), 0, 0);

      await prisma.timeEntry.create({
        data: {
          companyId: company1.id,
          employeeId: emp.id,
          workCenterId: wc.id,
          type: 'CHECK_IN',
          status: 'VALID',
          timestamp: checkIn,
          latitude: wc.latitude,
          longitude: wc.longitude,
          accuracy: 10,
          distanceToCenter: Math.random() * 50,
          isWithinZone: true,
          deviceType: i === 0 ? 'MOBILE_IOS' : 'WEB_BROWSER',
          clockMethod: i === 0 ? 'EMAIL_PASSWORD' : 'PIN',
          isManual: false,
        },
      });

      await prisma.timeEntry.create({
        data: {
          companyId: company1.id,
          employeeId: emp.id,
          workCenterId: wc.id,
          type: 'BREAK_START',
          status: 'VALID',
          timestamp: breakStart,
          latitude: wc.latitude,
          longitude: wc.longitude,
          accuracy: 10,
          isWithinZone: true,
          deviceType: i === 0 ? 'MOBILE_IOS' : 'WEB_BROWSER',
          clockMethod: i === 0 ? 'EMAIL_PASSWORD' : 'PIN',
          isManual: false,
        },
      });

      await prisma.timeEntry.create({
        data: {
          companyId: company1.id,
          employeeId: emp.id,
          workCenterId: wc.id,
          type: 'BREAK_END',
          status: 'VALID',
          timestamp: breakEnd,
          latitude: wc.latitude,
          longitude: wc.longitude,
          accuracy: 10,
          isWithinZone: true,
          deviceType: i === 0 ? 'MOBILE_IOS' : 'WEB_BROWSER',
          clockMethod: i === 0 ? 'EMAIL_PASSWORD' : 'PIN',
          isManual: false,
        },
      });

      await prisma.timeEntry.create({
        data: {
          companyId: company1.id,
          employeeId: emp.id,
          workCenterId: wc.id,
          type: 'CHECK_OUT',
          status: 'VALID',
          timestamp: checkOut,
          latitude: wc.latitude,
          longitude: wc.longitude,
          accuracy: 10,
          distanceToCenter: Math.random() * 50,
          isWithinZone: true,
          deviceType: i === 0 ? 'MOBILE_IOS' : 'WEB_BROWSER',
          clockMethod: i === 0 ? 'EMAIL_PASSWORD' : 'PIN',
          isManual: false,
        },
      });
    }
  }

  console.log('✅ Seed completed!');
  console.log('');
  console.log('📋 Test credentials:');
  console.log('  Superadmin:    marcandreueguerao@gmail.com / Admin1234!');
  console.log('  Company Admin: admin@techcorp.es      / Admin123!');
  console.log('  HR:            rrhh@techcorp.es        / Admin123!');
  console.log('  Employee 1:    ana.garcia@techcorp.es  / Admin123!  PIN: 1234');
  console.log('  Employee 2:    carlos.martinez@techcorp.es / Admin123!  PIN: 5678');
  console.log('  Employee 3:    maria.fernandez@techcorp.es / Admin123!  PIN: 9012');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
