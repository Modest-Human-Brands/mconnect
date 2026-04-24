import { defineComponent, computed } from 'vue'
import { jsx, Fragment } from '../jsx'
import { Html, Head, Body, Img, Container, Section, Text, Button, Tailwind, Font, Hr } from '@vue-email/components'

export const InternshipCertificate = defineComponent({
  props: {
    organization: {
      type: Object as () => {
        id: string
        name: string
        website: string
        branding: {
          logo: string
          color: { primary: string; accent: string }
          font: string
        }
        socials?: {
          instagram?: string
          facebook?: string
          youtube?: string
        }
      },
      required: true,
    },
    studentName: { type: String, required: true },
    internshipRole: { type: String, required: true },
    certificateUrl: { type: String, required: true },
  },

  setup(props) {
    const tailwindConfig = computed(() => ({
      theme: {
        extend: {
          colors: {
            primary: props.organization.branding.color.primary,
            accent: props.organization.branding.color.accent,
          },
        },
      },
    }))

    return () => {
      const { branding, name: orgName } = props.organization
      const primary = branding.color.primary
      const accent = branding.color.accent || primary
      const fontName = branding.font || 'Inter'
      const fontFamily = `'${fontName}', ui-sans-serif, system-ui, sans-serif`

      return (
        <Html>
          <Head>
            <Font
              fontFamily="Exo 2"
              fallbackFontFamily="Inter"
              webFont={{
                url: `https://fonts.gstatic.com/s/exo2/v26/7cHov4okm5zmbtYtG-wc5Q.woff2`,
                format: 'woff2',
              }}
              fontWeight="400"
              fontStyle="normal"
            />
          </Head>
          <Tailwind config={tailwindConfig.value}>
            <Body style={{ fontFamily }} class="m-0 p-0">
              <Section style={{ backgroundColor: primary }}>
                <Container class="mx-auto w-full max-w-[600px]">
                  <Section class="px-6 py-12">
                    <Section class="bg-white p-10 text-center shadow-2xl border-t-4" style={{ borderColor: primary }}>
                      <Img src={branding.logo} alt={orgName} width="100" class="mx-auto mb-6" />
                      <Text class="m-0 mb-2 text-sm font-bold tracking-widest uppercase" style={{ color: accent }}>
                        Certificate of Completion
                      </Text>

                      <Text class="m-0 text-2xl font-bold text-slate-900 leading-tight">Congratulations, {props.studentName}!</Text>

                      <Text class="m-0 mb-1 text-lg text-slate-600">You have successfully completed your tenure as a</Text>

                      <Text class="m-0 mb-1 text-lg font-bold" style={{ color: primary }}>
                        {props.internshipRole}
                      </Text>

                      <Text class="m-0 mb-6 text-lg text-slate-600">We truly appreciate your contributions to the team at {orgName}. Below you can download your official internship certificate.</Text>

                      <Section class="mx-auto text-center">
                        <Button
                          href={props.certificateUrl}
                          class="inline-block px-10 py-4 text-white text-sm font-bold uppercase tracking-wider no-underline rounded-lg shadow-lg"
                          style={{ backgroundColor: primary }}>
                          Download PDF Certificate
                        </Button>
                      </Section>
                    </Section>
                  </Section>
                </Container>
              </Section>
            </Body>
          </Tailwind>
        </Html>
      )
    }
  },
})
