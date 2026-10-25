import { createClient } from '@supabase/supabase-js';
import { schoolData, CLASSES } from '../data/schoolData.js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const seedSupabase = async () => {
    try {
        console.log("🚀 Starting Supabase data migration...");

        // 1. Migrate School Info
        const { students, faculty, facilities, testimonials, ...info } = schoolData;
        const { error: infoErr } = await supabase
            .from('school_info')
            .upsert({ id: 'info', ...info });
        if (infoErr) throw infoErr;
        console.log("✅ School info migrated");

        // 2. Migrate Faculty
        const { error: facultyErr } = await supabase
            .from('faculty')
            .upsert(faculty);
        if (facultyErr) throw facultyErr;
        console.log("✅ Faculty migrated");

        // 3. Migrate Facilities
        const { error: facilitiesErr } = await supabase
            .from('facilities')
            .upsert(facilities);
        if (facilitiesErr) throw facilitiesErr;
        console.log("✅ Facilities migrated");

        // 4. Migrate Testimonials
        const { error: testimonialsErr } = await supabase
            .from('testimonials')
            .upsert(testimonials);
        if (testimonialsErr) throw testimonialsErr;
        console.log("✅ Testimonials migrated");

        // 5. Migrate Classes Metadata
        const { error: metaErr } = await supabase
            .from('metadata')
            .upsert({ key: 'CLASSES', value: CLASSES });
        if (metaErr) throw metaErr;
        console.log("✅ Classes metadata migrated");

        // 6. Migrate Students
        const mappedStudents = students.map(s => ({
            id: s.id,
            password: s.password,
            name: s.name,
            grade: s.grade,
            image: s.image || '',
            results: s.results,
            attendance: s.attendance,
            previous_results: s.previousResults || [],
            admissions: s.admissions || []
        }));

        const { error: studentsErr } = await supabase
            .from('students')
            .upsert(mappedStudents);
        if (studentsErr) throw studentsErr;
        console.log(`✅ ${students.length} students migrated`);

        console.log("🎉 Migration completed successfully!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    }
};

seedSupabase();
