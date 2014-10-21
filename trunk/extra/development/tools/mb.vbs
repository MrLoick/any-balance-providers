Option Explicit

Dim returnValue
returnValue = createInput("� ��� ���� 10 ������ �� ���� ������� �������� ��� ��������� ��������� ���� �����. B)","��������� ���������",10000)

MsgBox returnValue,vbInformation,"�������� ��������"

'������� �������� ���� �������� �� inputBox � ��������� � �������������
Function createInput(prompt,title,timeout)
    Dim content, wnd, status
    '����� HTML ��� ����
    content =  "<html>" &_
                    "<head>" &_
                        "<style>" &_
                            "*{font-family:Tahoma;font-size:13px;}" &_
                            "button,textarea,span{position:absolute;}" &_
                            "button{width:80px;}" &_
                            "#lblPrompt{left:10px;top:10px;overflow:hidden;width:250px;height:80px;}" &_
                            "#btnOk{left:265px;top:10px;}" &_
                            "#btnCancel{left:265px;top:40px;}" &_
                            "#inpText{top:98px;width:330px;}" &_
                        "</style>" &_
                    "</head>" &_
                    "<body bgcolor=#F0F0F0>" &_
                        "<span id='lblPrompt'></span>" &_
                        "<button id='btnOk' onclick='window.returnValue=inpText.value;window.status=1'>OK</button>" &_
                        "<button id='btnCancel' onclick='window.status=1;'>������</button>" &_
                        "<textarea id='inpText'></textarea>" &_
                    "</body>" &_
                "</html>"

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
        '������ ����� �� ������ OK
        .btnOk.focus
        '����� ��������� ����
        .document.title = title
        '��������� ���� ������� � ����
        .lblPrompt.innerText = prompt
        '������� ������ �� ������ ��� ���������� (��� ������� ����� �������������� �� wnd.screenWidth / wnd.screenHeight)
        .moveTo 100, 100
        '����� ������ � ������ ������
        .resizeTo 370, 170
    End With
    
    
    Do
        '��������� ������ ����
        On Error Resume Next
        status = wnd.status
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
        WScript.Sleep 100
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