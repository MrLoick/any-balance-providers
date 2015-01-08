Option Explicit

Dim returnValue
returnValue = createInput("Enter history in 5 minutes","Adding history",(5 * 60) * 1000)

'������� �������� ���� �������� �� inputBox � ��������� � �������������
Function createInput(prompt,title,timeout)
    Dim content, wnd, status
    '����� HTML ��� ����
	'�������� �� �����
	Dim objStream

	Set objStream = CreateObject("ADODB.Stream")
	objStream.CharSet = "utf-8"
	objStream.Open
	objStream.LoadFromFile("..\\extra\\development\\tools\\wnd.html")
	content = objStream.ReadText()
	
    '������ ������ ��� ������ (��� �������, ��� ���� � �.�)
    Set wnd = createWindow(content,"border=dialog " &_
                                "minimizeButton=no " &_
                                "maximizeButton=no " &_
                                "scroll=no " &_
                                "showIntaskbar=yes " &_
                                "contextMenu=no " &_
                                "selection=no " &_
                                "innerBorder=no")

    
    '������������� ������ ��������
    wnd.execScript "window.setTimeout('window.close()'," & Clng(timeout) & ");window.returnValue=''"

    '��������� ������ ��� ������� �������
    With wnd
        '�� ��������� ���������� ������ 0 (����� ����� ��������� ��� � �����)
        .status = 0
        '������ ����� �� inpText
        .inpText.focus
        '����� ��������� ����
        .document.title = title
        '��������� ���� ������� � ����
        REM .lblPrompt.innerText = prompt
        '������� ������ �� ������ ��� ���������� (��� ������� ����� �������������� �� wnd.screenWidth / wnd.screenHeight)
        .moveTo 200, 200
        '����� ������ � ������ ������
        .resizeTo 370, 250
    End With
    
	Dim prevSelect
	
	prevSelect = 0
    
    Do
        '��������� ������ ����
        On Error Resume Next
        status = wnd.status
		'��������� ����� �������
		If prevSelect = wnd.standartMessages.selectedIndex Then

		Else
			wnd.inpText.value = wnd.standartMessages.Options(wnd.standartMessages.selectedIndex).Text
			prevSelect = wnd.standartMessages.selectedIndex
			End if
		
        '���� ������ ������� ������� [X], �� ��������� ������ ��������� � ����
        If Err.number <> 0 Then 
            On Error Goto 0
            '� ���� ������ ������� �� �����
            Exit Do
        Else
            '���� �� ������ ����� "1", �� ���������� �� ������� ����������� �������� � ������� �� �����
            if status = 1 Then 
                createInput = wnd.returnValue
                Exit Do
            End if
        End if
        WScript.Sleep 200
    Loop
    '�� ����� ������� ��������� ����
    wnd.close
End Function

'������� �������� HTA ����
Function createWindow(content,features)
    Dim wid, we, sw, id, i, doc
    Randomize:wid = Clng(Rnd*100000)
    Set we = CreateObject("WScript.Shell").Exec("mshta about:""" & _
    "<script>moveTo(-1000,-1000);resizeTo(0,0);</script>" & _
    "<hta:application id=app " & features & " />" & _
    "<object id=" & wid & " style='display:none' classid='clsid:8856F961-340A-11D0-A96B-00C04FD705A2'>" & _
    "<param name=RegisterAsBrowser value=1>" & _
    "</object>""")
    With CreateObject("Shell.Application")
        For i=1 to 1000
            For Each sw in .Windows
                On Error Resume Next
                id = Clng(sw.id)
                On Error Goto 0
                if id = wid Then
                    Set doc = sw.container
                    doc.write CStr(content)
                    Set createWindow = doc.parentWindow
                    Exit Function
                End if
            Next
        Next
    End With
    we.Terminate
    Err.Raise vbObjectError,"createWindow","Can't connect with created window !"
End Function

Function VBInputBox(promptText, def)
      VBInputBox = InputBox(promptText, "History helper", def)
End Function