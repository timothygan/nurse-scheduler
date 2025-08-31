import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🧹 Clearing existing data...')
  
  // Clear existing data in proper order (respecting foreign key constraints)
  await prisma.shiftAssignment.deleteMany()
  await prisma.schedule.deleteMany()
  await prisma.nursePreferences.deleteMany()
  await prisma.schedulingBlock.deleteMany()
  await prisma.nurseProfile.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()
  await prisma.hospital.deleteMany()

  console.log('✅ Existing data cleared!')
  console.log('🌱 Creating fresh test data...')

  // Create multiple test hospitals
  const hospitals = [
    {
      name: 'Metro General Hospital',
      timezone: 'America/New_York'
    },
    {
      name: 'St. Mary\'s Medical Center', 
      timezone: 'America/Chicago'
    },
    {
      name: 'Pacific Coast Regional',
      timezone: 'America/Los_Angeles'
    }
  ]

  const createdHospitals = []
  for (const hospitalData of hospitals) {
    const hospital = await prisma.hospital.create({
      data: hospitalData
    })
    createdHospitals.push(hospital)
    console.log(`🏥 Created hospital: ${hospital.name}`)
  }

  // Create schedulers for each hospital
  const schedulers = [
    {
      email: 'scheduler@metro.com',
      firstName: 'Amanda',
      lastName: 'Rodriguez',
      hospitalId: createdHospitals[0].id
    },
    {
      email: 'scheduler@stmarys.com', 
      firstName: 'David',
      lastName: 'Thompson',
      hospitalId: createdHospitals[1].id
    },
    {
      email: 'scheduler@pacific.com',
      firstName: 'Lisa',
      lastName: 'Kim',
      hospitalId: createdHospitals[2].id
    }
  ]

  const schedulerPassword = await bcrypt.hash('scheduler2025', 12)
  const createdSchedulers = []

  for (const schedulerData of schedulers) {
    const scheduler = await prisma.user.create({
      data: {
        ...schedulerData,
        passwordHash: schedulerPassword,
        role: 'SCHEDULER'
      }
    })
    createdSchedulers.push(scheduler)
    console.log(`👨‍💼 Created scheduler: ${scheduler.firstName} ${scheduler.lastName} at ${scheduler.email}`)
  }

  // Create diverse test nurses for Metro General Hospital (first hospital)
  const nurses = [
    {
      email: 'alice.johnson@metro.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      employeeId: 'MG001',
      seniorityLevel: 12,
      shiftTypes: '["DAY"]',
      qualifications: ['ICU', 'Critical Care', 'Advanced Life Support'],
      hireDate: '2012-03-15'
    },
    {
      email: 'carlos.martinez@metro.com',
      firstName: 'Carlos', 
      lastName: 'Martinez',
      employeeId: 'MG002',
      seniorityLevel: 8,
      shiftTypes: '["NIGHT"]',
      qualifications: ['Emergency Medicine', 'Trauma Care', 'ACLS'],
      hireDate: '2016-07-22'
    },
    {
      email: 'priya.patel@metro.com',
      firstName: 'Priya',
      lastName: 'Patel',
      employeeId: 'MG003',
      seniorityLevel: 5,
      shiftTypes: '["DAY", "NIGHT"]',
      qualifications: ['Pediatrics', 'Neonatal Care'],
      hireDate: '2019-01-10'
    },
    {
      email: 'james.wilson@metro.com',
      firstName: 'James',
      lastName: 'Wilson',
      employeeId: 'MG004',
      seniorityLevel: 15,
      shiftTypes: '["DAY"]',
      qualifications: ['Surgery', 'OR Management', 'Advanced Life Support'],
      hireDate: '2009-05-01'
    },
    {
      email: 'maria.garcia@metro.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      employeeId: 'MG005',
      seniorityLevel: 3,
      shiftTypes: '["NIGHT"]',
      qualifications: ['General Medicine', 'Basic Life Support'],
      hireDate: '2021-11-15'
    },
    {
      email: 'robert.lee@metro.com',
      firstName: 'Robert',
      lastName: 'Lee',
      employeeId: 'MG006',
      seniorityLevel: 7,
      shiftTypes: '["DAY", "NIGHT"]',
      qualifications: ['Oncology', 'Palliative Care'],
      hireDate: '2017-09-08'
    },
    {
      email: 'sarah.brown@metro.com',
      firstName: 'Sarah',
      lastName: 'Brown',
      employeeId: 'MG007',
      seniorityLevel: 10,
      shiftTypes: '["DAY"]',
      qualifications: ['Cardiology', 'Cardiac Care', 'ACLS'],
      hireDate: '2014-02-20'
    },
    {
      email: 'kevin.zhang@metro.com',
      firstName: 'Kevin',
      lastName: 'Zhang',
      employeeId: 'MG008',
      seniorityLevel: 2,
      shiftTypes: '["NIGHT"]',
      qualifications: ['General Medicine', 'Basic Life Support'],
      hireDate: '2022-08-01'
    }
  ]

  const nursePassword = await bcrypt.hash('nurse2025', 12)

  for (const nurseData of nurses) {
    const user = await prisma.user.create({
      data: {
        email: nurseData.email,
        firstName: nurseData.firstName,
        lastName: nurseData.lastName,
        passwordHash: nursePassword,
        role: 'NURSE',
        hospitalId: createdHospitals[0].id // Metro General Hospital
      }
    })

    await prisma.nurseProfile.create({
      data: {
        userId: user.id,
        employeeId: nurseData.employeeId,
        hireDate: new Date(nurseData.hireDate),
        seniorityLevel: nurseData.seniorityLevel,
        shiftTypes: nurseData.shiftTypes,
        qualifications: nurseData.qualifications,
        contractHoursPerWeek: 40,
        maxShiftsPerBlock: 14
      }
    })

    console.log(`👩‍⚕️ Created nurse: ${user.firstName} ${user.lastName} (${nurseData.employeeId})`)
  }

  // Create a sample scheduling block for Metro General Hospital
  const schedulingBlock = await prisma.schedulingBlock.create({
    data: {
      name: 'February 2026 Schedule',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-02-28'),
      status: 'DRAFT',
      hospitalId: createdHospitals[0].id,
      createdById: createdSchedulers[0].id,
      rules: {
        minShiftsPerNurse: 5,
        maxShiftsPerNurse: 14,
        minConsecutiveDays: 2,
        maxConsecutiveDays: 5,
        minRestBetweenShifts: 10,
        maxPTOPerNurse: 3,
        maxNoSchedulePerNurse: 2,
        maxTotalTimeOff: 4,
        blackoutDates: [],
        requiredCoverage: {
          DAY: 4,
          NIGHT: 3,
          WEEKEND_DAY: 3,
          WEEKEND_NIGHT: 2
        },
        minWeekendsPerNurse: 1,
        requireAlternatingWeekends: true,
        requireEvenDistribution: true,
        enableSeniorityBias: false,
        seniorityBiasWeight: 0.3,
        customMessages: {}
      }
    }
  })

  console.log(`📅 Created scheduling block: ${schedulingBlock.name}`)

  console.log('\n✅ Fresh test data created successfully!')
  console.log('\n📧 Test accounts:')
  console.log('   🏥 Metro General Hospital:')
  console.log('      Scheduler: scheduler@metro.com / scheduler2025')
  console.log('      Nurses: alice.johnson@metro.com, carlos.martinez@metro.com, etc. / nurse2025')
  console.log('\n   🏥 St. Mary\'s Medical Center:')
  console.log('      Scheduler: scheduler@stmarys.com / scheduler2025')
  console.log('\n   🏥 Pacific Coast Regional:')
  console.log('      Scheduler: scheduler@pacific.com / scheduler2025')
  console.log('\n🎯 Ready for testing with realistic hospital data!')
}

main()
  .catch((e) => {
    console.error('❌ Database reset failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })