const { PrismaClient } = require('./src/generated/prisma')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function generateTestData() {
  try {
    console.log('🏥 Generating test nurses and preferences...')
    
    // Get the hospital ID and scheduling block
    const hospital = await prisma.hospital.findFirst()
    const schedulingBlock = await prisma.schedulingBlock.findFirst({
      where: { name: { contains: 'Test Block - 2025-09-06' } }
    })
    
    if (!hospital || !schedulingBlock) {
      console.error('❌ Hospital or scheduling block not found')
      return
    }
    
    console.log(`✅ Found hospital: ${hospital.name}`)
    console.log(`✅ Found scheduling block: ${schedulingBlock.name}`)
    
    // Generate 6 test nurses
    const nurses = [
      { firstName: 'Sarah', lastName: 'Johnson', email: 'sarah.johnson@hospital.com', seniorityLevel: 3, shiftTypes: ['DAY', 'NIGHT'] },
      { firstName: 'Michael', lastName: 'Chen', email: 'michael.chen@hospital.com', seniorityLevel: 2, shiftTypes: ['DAY'] },
      { firstName: 'Emily', lastName: 'Davis', email: 'emily.davis@hospital.com', seniorityLevel: 4, shiftTypes: ['NIGHT'] },
      { firstName: 'Robert', lastName: 'Wilson', email: 'robert.wilson@hospital.com', seniorityLevel: 1, shiftTypes: ['DAY', 'NIGHT'] },
      { firstName: 'Jessica', lastName: 'Brown', email: 'jessica.brown@hospital.com', seniorityLevel: 5, shiftTypes: ['DAY'] },
      { firstName: 'David', lastName: 'Martinez', email: 'david.martinez@hospital.com', seniorityLevel: 2, shiftTypes: ['NIGHT'] }
    ]
    
    const createdNurses = []
    
    for (const nurseData of nurses) {
      // Check if nurse already exists
      const existingNurse = await prisma.user.findUnique({
        where: { email: nurseData.email }
      })
      
      let nurse
      if (existingNurse) {
        nurse = existingNurse
        console.log(`👤 Using existing nurse: ${nurse.firstName} ${nurse.lastName}`)
      } else {
        // Create nurse user
        nurse = await prisma.user.create({
          data: {
            email: nurseData.email,
            firstName: nurseData.firstName,
            lastName: nurseData.lastName,
            role: 'NURSE',
            passwordHash: await bcrypt.hash('password123', 12),
            hospitalId: hospital.id
          }
        })
        console.log(`✅ Created nurse: ${nurse.firstName} ${nurse.lastName}`)
      }
      
      // Create or update nurse profile
      const existingProfile = await prisma.nurseProfile.findUnique({
        where: { userId: nurse.id }
      })
      
      let nurseProfile
      if (existingProfile) {
        nurseProfile = existingProfile
        console.log(`📋 Using existing profile for: ${nurse.firstName} ${nurse.lastName}`)
      } else {
        nurseProfile = await prisma.nurseProfile.create({
          data: {
            userId: nurse.id,
            employeeId: `EMP${nurse.id.slice(-6)}`,
            hireDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000 * 5), // Random date within last 5 years
            seniorityLevel: nurseData.seniorityLevel,
            shiftTypes: JSON.stringify(nurseData.shiftTypes),
            qualifications: ['RN', 'BLS'],
            contractHoursPerWeek: 40,
            maxShiftsPerBlock: 15
          }
        })
        console.log(`📋 Created profile for: ${nurse.firstName} ${nurse.lastName}`)
      }
      
      createdNurses.push({ nurse, nurseProfile, shiftTypes: nurseData.shiftTypes })
    }
    
    // Generate preferences for the scheduling block (Sep 6-19, 2025)
    const startDate = new Date('2025-09-06')
    const endDate = new Date('2025-09-19')
    
    for (const { nurse, nurseProfile, shiftTypes } of createdNurses) {
      // Check if preferences already exist
      const existingPrefs = await prisma.nursePreferences.findFirst({
        where: {
          nurseId: nurse.id,
          schedulingBlockId: schedulingBlock.id
        }
      })
      
      if (existingPrefs) {
        console.log(`📅 Preferences already exist for: ${nurse.firstName} ${nurse.lastName}`)
        continue
      }
      
      // Generate realistic preferences
      const preferredShifts = {}
      const ptoRequests = []
      const noScheduleRequests = []
      
      let currentDate = new Date(startDate)
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0]
        
        // Random chance for PTO or no-schedule requests
        const random = Math.random()
        if (random < 0.05) { // 5% chance of PTO
          ptoRequests.push(dateString)
        } else if (random < 0.1) { // 5% chance of no-schedule
          noScheduleRequests.push(dateString)
        } else {
          // Generate shift preferences based on nurse's available shift types
          if (shiftTypes.length === 1) {
            preferredShifts[dateString] = shiftTypes[0]
          } else {
            // For nurses who can work both shifts, vary preferences
            const preference = Math.random()
            if (preference < 0.4) {
              preferredShifts[dateString] = 'DAY'
            } else if (preference < 0.8) {
              preferredShifts[dateString] = 'NIGHT'
            } else {
              preferredShifts[dateString] = 'ANY' // Flexible
            }
          }
        }
        
        currentDate.setDate(currentDate.getDate() + 1)
      }
      
      // Create nurse preferences
      await prisma.nursePreferences.create({
        data: {
          nurseId: nurse.id,
          schedulingBlockId: schedulingBlock.id,
          preferredShifts: JSON.stringify(preferredShifts),
          ptoRequests: JSON.stringify(ptoRequests),
          noScheduleRequests: JSON.stringify(noScheduleRequests),
          flexibilityScore: Math.random() * 0.5 + 0.5, // Between 0.5 and 1.0
          submittedAt: new Date()
        }
      })
      
      console.log(`📅 Created preferences for: ${nurse.firstName} ${nurse.lastName}`)
      console.log(`   - Preferred shifts: ${Object.keys(preferredShifts).length}`)
      console.log(`   - PTO requests: ${ptoRequests.length}`)
      console.log(`   - No-schedule requests: ${noScheduleRequests.length}`)
    }
    
    console.log(`\n🎉 Successfully generated ${createdNurses.length} nurses with preferences!`)
    console.log(`📊 Summary:`)
    console.log(`   - Hospital: ${hospital.name}`)
    console.log(`   - Scheduling Block: ${schedulingBlock.name}`)
    console.log(`   - Period: ${schedulingBlock.startDate.toISOString().split('T')[0]} to ${schedulingBlock.endDate.toISOString().split('T')[0]}`)
    console.log(`   - Nurses: ${createdNurses.length}`)
    console.log(`   - Coverage Requirements: 3 DAY + 2 NIGHT shifts per day`)
    
  } catch (error) {
    console.error('❌ Error generating test data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

generateTestData()