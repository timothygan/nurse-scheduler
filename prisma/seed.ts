import { PrismaClient } from '../src/generated/prisma'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create test hospital
  const existingHospital = await prisma.hospital.findFirst({
    where: { name: 'General Hospital' }
  })
  
  const hospital = existingHospital || await prisma.hospital.create({
    data: {
      name: 'General Hospital',
      timezone: 'America/New_York'
    }
  })

  // Create scheduler user
  const schedulerPassword = await bcrypt.hash('password123', 12)
  const scheduler = await prisma.user.upsert({
    where: { email: 'scheduler@hospital.com' },
    update: {},
    create: {
      email: 'scheduler@hospital.com',
      firstName: 'John',
      lastName: 'Scheduler',
      passwordHash: schedulerPassword,
      role: 'SCHEDULER',
      hospitalId: hospital.id
    }
  })

  // Create test nurses
  const nurses = [
    {
      email: 'nurse1@hospital.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      employeeId: 'N001',
      seniorityLevel: 8,
      shiftTypes: '["DAY"]',
      qualifications: ['ICU', 'Advanced Life Support']
    },
    {
      email: 'nurse2@hospital.com', 
      firstName: 'Michael',
      lastName: 'Chen',
      employeeId: 'N002',
      seniorityLevel: 5,
      shiftTypes: '["NIGHT"]',
      qualifications: ['Emergency Medicine', 'Trauma Care']
    },
    {
      email: 'nurse3@hospital.com',
      firstName: 'Emily',
      lastName: 'Davis',
      employeeId: 'N003',
      seniorityLevel: 3,
      shiftTypes: '["DAY", "NIGHT"]',
      qualifications: ['Pediatrics', 'Basic Life Support']
    }
  ]

  const nursePassword = await bcrypt.hash('nurse123', 12)

  for (const nurseData of nurses) {
    const user = await prisma.user.upsert({
      where: { email: nurseData.email },
      update: {},
      create: {
        email: nurseData.email,
        firstName: nurseData.firstName,
        lastName: nurseData.lastName,
        passwordHash: nursePassword,
        role: 'NURSE',
        hospitalId: hospital.id
      }
    })

    await prisma.nurseProfile.upsert({
      where: { employeeId: nurseData.employeeId },
      update: {},
      create: {
        userId: user.id,
        employeeId: nurseData.employeeId,
        hireDate: new Date('2020-01-01'),
        seniorityLevel: nurseData.seniorityLevel,
        shiftTypes: nurseData.shiftTypes,
        qualifications: nurseData.qualifications,
        contractHoursPerWeek: 40,
        maxShiftsPerBlock: 12
      }
    })
  }

  console.log('✅ Seeding completed!')
  console.log('📧 Test accounts created:')
  console.log('   Scheduler: scheduler@hospital.com / password123')
  console.log('   Nurses: nurse1@hospital.com, nurse2@hospital.com, nurse3@hospital.com / nurse123')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })